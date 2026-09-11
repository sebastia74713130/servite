import { NextResponse } from "next/server";
import * as soap from "soap";
import { siatConfig } from "@/lib/siat/config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  let methodNameStr = 'unknown';
  try {
    const { restaurantId, methodName } = await req.json();
    methodNameStr = methodName;

    if (!restaurantId || !methodName) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (dbError || !siatSettings || !siatSettings.siat_cuis) {
      return NextResponse.json({ error: "Configuración SIAT incompleta" }, { status: 400 });
    }

    const client = await soap.createClientAsync(siatConfig.wsdlSincronizacion);
    client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);

    const args = {
      SolicitudSincronizacion: {
        codigoAmbiente: siatConfig.ambiente,
        codigoPuntoVenta: parseInt(siatSettings.siat_codigo_punto_venta) || 0,
        codigoSistema: siatConfig.codigoSistema,
        codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
        cuis: siatSettings.siat_cuis,
        nit: parseInt(siatSettings.siat_nit, 10),
      }
    };

    // Ejecutar el método dinámicamente
    const methodAsync = `${methodName}Async`;
    if (typeof (client as any)[methodAsync] !== 'function') {
      return NextResponse.json({ error: `Método ${methodName} no encontrado en el WSDL` }, { status: 400 });
    }

    const [result] = await (client as any)[methodAsync](args);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(`Error en robot/execute para ${methodNameStr}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
