import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as soap from "soap";
import { siatConfig } from "@/lib/siat/config";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function getBoliviaTime(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', '') + '-04:00';
}
function getBoliviaTimeForXML(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', '');
}

async function createClientWithRetry(url: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await soap.createClientAsync(url);
        } catch (e) {
            await delay(1000);
        }
    }
    throw new Error(`Fallo al conectar con WSDL ${url}`);
}

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // Simple security check (could be expanded)
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'servido-secret'}`) {
            // return NextResponse.json({ error: "No autorizado" }, { status: 401 });
            // Dejamos pasar para pruebas manuales si no hay CRON_SECRET, pero en prod debería estar
        }

        // 1. Obtener facturas pendientes
        const { data: invoices, error: dbError } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('siat_estado', 'PENDIENTE_OFFLINE');

        if (dbError) throw dbError;
        if (!invoices || invoices.length === 0) {
            return NextResponse.json({ success: true, message: "No hay facturas pendientes de sincronización offline." });
        }

        // Agrupar por restaurante
        const grouped = invoices.reduce((acc: any, inv: any) => {
            if (!acc[inv.restaurant_id]) acc[inv.restaurant_id] = [];
            acc[inv.restaurant_id].push(inv);
            return acc;
        }, {});

        const logs = [];

        // 2. Procesar por restaurante
        for (const restaurantId of Object.keys(grouped)) {
            const { data: siatSettings } = await supabaseAdmin
                .from('restaurant_siat_settings')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .single();

            if (!siatSettings || !siatSettings.siat_cuis || !siatSettings.siat_cufd) {
                logs.push(`Restaurante ${restaurantId} saltado: Configuración SIAT incompleta.`);
                continue;
            }

            const opsClient = await createClientWithRetry(siatConfig.wsdlOperaciones);
            opsClient.addHttpHeader("apikey", `TokenApi ${siatSettings.siat_token_delegado}`);
            
            const compraVentaClient = await createClientWithRetry(siatConfig.wsdlCompraVenta);
            compraVentaClient.addHttpHeader("apikey", `TokenApi ${siatSettings.siat_token_delegado}`);

            const pv = parseInt(siatSettings.siat_codigo_punto_venta) || 0;
            const facturas = grouped[restaurantId];
            
            // Dividir en chunks de 500
            const chunks = [];
            for (let i = 0; i < facturas.length; i += 500) {
                chunks.push(facturas.slice(i, i + 500));
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const cantidadFacturas = chunk.length;

                // A. Registrar Evento Significativo (1 = Corte de Internet)
                let codigoEvento = '';
                const eventStart = getBoliviaTime(-60000); // 1 minuto antes
                const eventEnd = getBoliviaTime(0); // Ahora
                
                try {
                    const [eventResult] = await opsClient.registroEventoSignificativoAsync({
                        SolicitudEventoSignificativo: { 
                            codigoAmbiente: siatConfig.ambiente, codigoMotivoEvento: 1, codigoPuntoVenta: pv, 
                            codigoSistema: siatSettings.siat_codigo_sistema, codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0, 
                            cufd: siatSettings.siat_cufd, cufdEvento: siatSettings.siat_cufd, cuis: siatSettings.siat_cuis, 
                            descripcion: 'CORTE DEL SERVICIO DE INTERNET', fechaHoraFinEvento: eventEnd, fechaHoraInicioEvento: eventStart, 
                            nit: parseInt(siatSettings.siat_nit, 10) 
                        }
                    });
                    if (eventResult.RespuestaListaEventos?.transaccion) {
                        codigoEvento = eventResult.RespuestaListaEventos.codigoRecepcionEventoSignificativo;
                    } else {
                        logs.push(`SIAT rechazó el evento: ${JSON.stringify(eventResult)}`);
                    }
                } catch(e: any) {
                    logs.push(`Falla al registrar evento para rest ${restaurantId}: ${e.message} | ${JSON.stringify(e.Fault || e)}`);
                    continue;
                }

                if (!codigoEvento) {
                    logs.push(`No se obtuvo codigoEvento para rest ${restaurantId}`);
                    continue;
                }

                // B. Empaquetar XMLs
                const tempDir = path.join('/tmp', `siat_paquete_${restaurantId}_${Date.now()}`);
                if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
                fs.mkdirSync(tempDir, { recursive: true });

                for (let f = 0; f < chunk.length; f++) {
                    const inv = chunk[f];
                    fs.writeFileSync(path.join(tempDir, `factura_${f}.xml`), inv.xml_signed);
                }

                const tarName = `paquete_${restaurantId}_${i}.tar.gz`;
                const tarPath = path.join('/tmp', tarName);
                execSync(`cd ${tempDir} && tar -czf ${tarPath} *`);

                const gzipBuffer = fs.readFileSync(tarPath);
                const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");
                const archivoBase64 = gzipBuffer.toString("base64");

                // C. Enviar Paquete
                try {
                    const [recepResult] = await compraVentaClient.recepcionPaqueteFacturaAsync({
                        SolicitudServicioRecepcionPaquete: {
                            codigoAmbiente: siatConfig.ambiente, codigoDocumentoSector: 1, codigoEmision: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
                            codigoSistema: siatSettings.siat_codigo_sistema, codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0, 
                            cufd: siatSettings.siat_cufd, cuis: siatSettings.siat_cuis, nit: parseInt(siatSettings.siat_nit, 10),
                            tipoFacturaDocumento: 1, archivo: archivoBase64, fechaEnvio: getBoliviaTimeForXML(), hashArchivo: hashArchivo,
                            cafc: siatSettings.siat_cafc || "", cantidadFacturas: cantidadFacturas, codigoEvento: codigoEvento
                        }
                    });

                    if (recepResult.RespuestaServicioFacturacion?.transaccion) {
                        const codigoRecepcion = recepResult.RespuestaServicioFacturacion.codigoRecepcion;
                        
                        // D. Actualizar BD a PAQUETE_ENVIADO
                        const invIds = chunk.map((c: any) => c.id);
                        await supabaseAdmin.from('invoices').update({
                            siat_estado: 'PAQUETE_ENVIADO',
                            codigo_recepcion: codigoRecepcion
                        }).in('id', invIds);
                        
                        logs.push(`Enviado paquete ${codigoRecepcion} para ${restaurantId} con ${cantidadFacturas} facturas.`);
                    } else {
                        logs.push(`Rechazo del SIAT al enviar paquete de ${restaurantId}: ${JSON.stringify(recepResult.RespuestaServicioFacturacion)}`);
                    }
                } catch(e: any) {
                    logs.push(`Error de red al enviar paquete para ${restaurantId}: ${e.message}`);
                }

                // Limpieza tmp
                fs.rmSync(tempDir, { recursive: true, force: true });
                fs.unlinkSync(tarPath);
            }
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error("Error sincronizando offline:", error);
        return NextResponse.json({ error: error.message || "Error interno sincronizando facturas" }, { status: 500 });
    }
}
