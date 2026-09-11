import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as soap from "soap";
import { siatConfig } from "@/lib/siat/config";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'servido-secret'}`) {}

        // 1. Obtener facturas en PAQUETE_ENVIADO
        const { data: invoices, error: dbError } = await supabaseAdmin
            .from('invoices')
            .select('id, restaurant_id, codigo_recepcion')
            .eq('siat_estado', 'PAQUETE_ENVIADO');

        if (dbError) throw dbError;
        if (!invoices || invoices.length === 0) {
            return NextResponse.json({ success: true, message: "No hay paquetes pendientes de validación." });
        }

        // Agrupar por restaurant y luego por codigoRecepcion
        const grouped: any = {};
        invoices.forEach((inv: any) => {
            if (!inv.codigo_recepcion) return;
            if (!grouped[inv.restaurant_id]) grouped[inv.restaurant_id] = {};
            if (!grouped[inv.restaurant_id][inv.codigo_recepcion]) {
                grouped[inv.restaurant_id][inv.codigo_recepcion] = [];
            }
            grouped[inv.restaurant_id][inv.codigo_recepcion].push(inv.id);
        });

        const logs = [];

        // 2. Procesar validaciones
        for (const restaurantId of Object.keys(grouped)) {
            const { data: siatSettings } = await supabaseAdmin
                .from('restaurant_siat_settings')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .single();

            if (!siatSettings || !siatSettings.siat_cuis || !siatSettings.siat_cufd) {
                logs.push(`Restaurante ${restaurantId} saltado: Sin configuración.`);
                continue;
            }

            const compraVentaClient = await createClientWithRetry(siatConfig.wsdlCompraVenta);
            compraVentaClient.addHttpHeader("apikey", `TokenApi ${siatSettings.siat_token_delegado}`);

            const pv = parseInt(siatSettings.siat_codigo_punto_venta) || 0;

            const codigosRecepcion = Object.keys(grouped[restaurantId]);

            for (const codigoRecepcion of codigosRecepcion) {
                const invIds = grouped[restaurantId][codigoRecepcion];

                try {
                    const [valResult] = await compraVentaClient.validacionRecepcionPaqueteFacturaAsync({
                        SolicitudServicioValidacionRecepcionPaquete: {
                            codigoAmbiente: siatConfig.ambiente, codigoDocumentoSector: 1, codigoEmision: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
                            codigoSistema: siatSettings.siat_codigo_sistema, codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
                            cufd: siatSettings.siat_cufd, cuis: siatSettings.siat_cuis, nit: parseInt(siatSettings.siat_nit, 10),
                            tipoFacturaDocumento: 1, codigoRecepcion: codigoRecepcion
                        }
                    });

                    const resp = valResult.RespuestaServicioFacturacion;
                    const codDesc = resp?.codigoDescripcion;

                    if (codDesc === 'VALIDADA') {
                        await supabaseAdmin.from('invoices').update({
                            siat_estado: 'VALIDADA'
                        }).in('id', invIds);
                        logs.push(`Paquete ${codigoRecepcion} VALIDADO OK.`);
                    } else if (codDesc === 'RECHAZADA' || codDesc === 'OBSERVADA') {
                        const detalles = JSON.stringify(resp?.mensajesList || resp);
                        await supabaseAdmin.from('invoices').update({
                            siat_estado: 'RECHAZADA',
                            detalles_error: detalles
                        }).in('id', invIds);
                        logs.push(`Paquete ${codigoRecepcion} RECHAZADO: ${detalles}`);
                    } else {
                        // PENDIENTE u otro estado en proceso, no hacemos nada
                        logs.push(`Paquete ${codigoRecepcion} aún en estado: ${codDesc}`);
                    }
                } catch(e: any) {
                    logs.push(`Error de red al validar paquete ${codigoRecepcion}: ${e.message}`);
                }
            }
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error("Error validando paquetes offline:", error);
        return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
    }
}
