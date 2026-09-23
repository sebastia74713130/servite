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

export async function POST(req: Request) {
    try {
        const { restaurantId, cuf } = await req.json();

        if (!restaurantId || !cuf) {
            return NextResponse.json({ error: "Faltan parámetros: restaurantId y cuf" }, { status: 400 });
        }

        const { data: siatSettings } = await supabaseAdmin
            .from('restaurant_siat_settings')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .single();

        if (!siatSettings || !siatSettings.siat_cuis || !siatSettings.siat_cufd) {
            return NextResponse.json({ error: "Configuración SIAT incompleta en este restaurante" }, { status: 400 });
        }

        const compraVentaClient = await createClientWithRetry(siatConfig.wsdlCompraVenta);
        compraVentaClient.addHttpHeader("apikey", `TokenApi ${siatSettings.siat_token_delegado}`);

        const pv = parseInt(siatSettings.siat_codigo_punto_venta) || 0;

        const [result] = await compraVentaClient.reversionAnulacionFacturaAsync({
            SolicitudServicioReversionAnulacionFactura: {
                codigoAmbiente: siatConfig.ambiente,
                codigoDocumentoSector: 1,
                codigoEmision: 1, // 1 = Online, 2 = Offline (We assume it's sent to SIAT)
                codigoModalidad: 1, // Electronica en linea
                codigoPuntoVenta: pv,
                codigoSistema: siatSettings.siat_codigo_sistema,
                codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
                cufd: siatSettings.siat_cufd,
                cuis: siatSettings.siat_cuis,
                nit: parseInt(siatSettings.siat_nit, 10),
                tipoFacturaDocumento: 1, // Factura con derecho a credito fiscal
                cuf: cuf
            }
        });

        const resp = result.RespuestaServicioFacturacion;
        if (resp && resp.transaccion) {
            // Actualizar estado local
            await supabaseAdmin.from('invoices').update({
                siat_estado: 'VALIDADA',
                detalles_error: 'Reversión de anulación exitosa'
            }).eq('cuf', cuf);

            return NextResponse.json({ success: true, message: "Reversión de anulación exitosa" });
        } else {
            const errores = resp?.mensajesList || resp;
            return NextResponse.json({ success: false, error: "Rechazo del SIAT", detalles: errores }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Error al revertir anulación:", error);
        return NextResponse.json({ error: error.message || "Error interno revertir anulación" }, { status: 500 });
    }
}
