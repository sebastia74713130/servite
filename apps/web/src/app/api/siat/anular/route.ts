import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as soap from "soap";
import { resolveBranchId } from "@/lib/siat/branchHelper";
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
        const { restaurantId, cuf, codigoMotivoAnulacion } = await req.json();

        if (!restaurantId || !cuf) {
            return NextResponse.json({ error: "Faltan parámetros: restaurantId y cuf" }, { status: 400 });
        }

        
        const { data: invoice } = await supabaseAdmin.from('invoices').select('branch_id').eq('cuf', cuf).single();
        const branchId = await resolveBranchId(restaurantId, invoice?.branch_id);

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

        
        let cuis = siatSettings.siat_cuis;
        let cufd = siatSettings.siat_cufd;
        let sucursal = siatSettings.siat_codigo_sucursal ? String(siatSettings.siat_codigo_sucursal) : "0";
        let puntoVenta = siatSettings.siat_codigo_punto_venta ? String(siatSettings.siat_codigo_punto_venta) : "0";

        if (branchId) {
            const { data: branchData } = await supabaseAdmin.from('branches').select('*').eq('id', branchId).single();
            if (branchData) {
                cuis = branchData.siat_cuis || cuis;
                cufd = branchData.siat_cufd || cufd;
                sucursal = branchData.siat_codigo_sucursal !== null ? String(branchData.siat_codigo_sucursal) : sucursal;
                puntoVenta = branchData.siat_codigo_punto_venta !== null ? String(branchData.siat_codigo_punto_venta) : puntoVenta;
            }
        }

        const pv = parseInt(puntoVenta) || 0;
        const motivo = codigoMotivoAnulacion || 1; // 1 = FACTURA MAL EMITIDA

        const [result] = await compraVentaClient.anulacionFacturaAsync({
            SolicitudServicioAnulacionFactura: {
                codigoAmbiente: siatConfig.ambiente,
                codigoDocumentoSector: 1,
                codigoEmision: 1, // 1 = Online, 2 = Offline (We assume it's sent to SIAT)
                codigoModalidad: 1, // Electronica en linea
                codigoPuntoVenta: pv,
                codigoSistema: siatSettings.siat_codigo_sistema,
                codigoSucursal: parseInt(sucursal) || 0,
                cufd: cufd,
                cuis: cuis,
                nit: parseInt(siatSettings.siat_nit, 10),
                tipoFacturaDocumento: 1, // Factura con derecho a credito fiscal
                cuf: cuf,
                codigoMotivo: motivo
            }
        });

        const resp = result.RespuestaServicioFacturacion;
        if (resp && resp.transaccion) {
            // Actualizar estado local
            await supabaseAdmin.from('invoices').update({
                siat_estado: 'ANULADA',
                detalles_error: 'Factura anulada correctamente'
            }).eq('cuf', cuf);

            return NextResponse.json({ success: true, message: "Factura anulada exitosamente" });
        } else {
            const errores = resp?.mensajesList || resp;
            return NextResponse.json({ success: false, error: "Rechazo del SIAT", detalles: errores }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Error al anular factura:", error);
        return NextResponse.json({ error: error.message || "Error interno anular factura" }, { status: 500 });
    }
}
