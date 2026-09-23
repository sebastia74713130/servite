import { supabaseAdmin } from "./src/lib/supabase-admin";
import * as soap from "soap";

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

function getBoliviaTime(offsetMs = 0) {
    const now = new Date();
    const boliviaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000) + offsetMs);
    return boliviaTime.toISOString().replace('Z', '');
}

async function main() {
    const restaurantId = '5872f8d9-49a2-482d-9ce0-c88d66370e28';
    const { data: siatSettings } = await supabaseAdmin
        .from('restaurant_siat_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();
    console.log("SIAT Settings:", !!siatSettings);

    const opsClient = await createClientWithRetry("https://pilotosiatservicios.impuestos.gob.bo/v2/OperacionesFacturacionCompraVenta?wsdl");
    opsClient.addHttpHeader("apikey", `TokenApi ${siatSettings.siat_token_delegado}`);

    const pv = parseInt(siatSettings.siat_codigo_punto_venta) || 0;
    const eventStart = getBoliviaTime(-60000); 
    const eventEnd = getBoliviaTime(0);

    const payload = {
        SolicitudEventoSignificativo: { 
            codigoAmbiente: 2, 
            codigoMotivoEvento: 1, 
            codigoPuntoVenta: pv, 
            codigoSistema: siatSettings.siat_codigo_sistema, 
            codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0, 
            cufd: siatSettings.siat_cufd, 
            cufdEvento: siatSettings.siat_cufd, 
            cuis: siatSettings.siat_cuis, 
            descripcion: 'CORTE DEL SERVICIO DE INTERNET', 
            fechaHoraFinEvento: eventEnd, 
            fechaHoraInicioEvento: eventStart, 
            nit: parseInt(siatSettings.siat_nit, 10) 
        }
    };
    console.log("Payload:", payload);

    try {
        const [eventResult] = await opsClient.registroEventoSignificativoAsync(payload);
        console.log("Result:", JSON.stringify(eventResult, null, 2));
    } catch(e: any) {
        console.log("Error:", e.message, e.Fault || e.response?.data);
    }
}
main();
