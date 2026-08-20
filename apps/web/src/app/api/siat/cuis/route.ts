import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { solicitarCUIS } from "@/lib/siat/services/solicitarCUIS";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId } = body;

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

    // 2. Solicitar CUIS
    const response = await solicitarCUIS({
      codigoAmbiente: 2, // Piloto
      codigoModalidad: 1, // Electrónica en Línea
      codigoPuntoVenta: parseInt(siatSettings.siat_codigo_punto_venta) || 0,
      codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
    });

    const codigoCuis = response?.RespuestaCuis?.codigo;
    if (!codigoCuis) {
       throw new Error(JSON.stringify(response));
    }

    // 3. Guardar en Supabase
    await supabaseAdmin
      .from('restaurant_siat_settings')
      .update({ siat_cuis: codigoCuis })
      .eq('restaurant_id', restaurantId);

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
