import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { solicitarCUIS } from "@/lib/siat/services/solicitarCUIS";
import { siatConfig } from "@/lib/siat/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, overridePuntoVenta } = body;
    const branchId = body.branchId || restaurantId;

    if (!branchId) {
      return NextResponse.json({ error: "Falta el ID de la sucursal" }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "Falta el ID del restaurante" }, { status: 400 });
    }

    // 1. Obtener la configuración del SIAT del restaurante
    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (dbError || !siatSettings) {
      return NextResponse.json({ error: "El restaurante no tiene configurado el SIAT" }, { status: 404 });
    }
    
    // Obtener la configuración de la sucursal
    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('siat_codigo_sucursal, siat_codigo_punto_venta')
      .eq('id', branchId)
      .single();

    if (branchError || !branchData) {
      return NextResponse.json({ error: "No se encontró la configuración de la sucursal" }, { status: 404 });
    }

    const pv = overridePuntoVenta !== undefined ? overridePuntoVenta : parseInt(branchData.siat_codigo_punto_venta) || 0;

    // 2. Solicitar CUIS
    const response = await solicitarCUIS({
      codigoAmbiente: siatConfig.ambiente,
      codigoModalidad: 1, // Electrónica en Línea
      codigoPuntoVenta: pv,
      codigoSucursal: parseInt(branchData.siat_codigo_sucursal) || 0,
      nit: parseInt(siatSettings.siat_nit, 10),
    });

    const codigoCuis = response?.RespuestaCuis?.codigo;
    if (!codigoCuis) {
       throw new Error(JSON.stringify(response));
    }

    // 3. Guardar en Supabase 
    if (overridePuntoVenta === undefined) {
      await supabaseAdmin
        .from('branches')
        .update({ siat_cuis: codigoCuis })
        .eq('id', branchId);
    }

    return NextResponse.json({
      success: true,
      message: "CUIS obtenido exitosamente.",
      cuis: codigoCuis,
      data: response,
    });
  } catch (error: any) {
    console.error("Error en solicitar CUIS:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al solicitar CUIS al SIAT.",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
