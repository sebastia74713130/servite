import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { solicitarCUFD } from "@/lib/siat/services/solicitarCUFD";

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

    if (!siatSettings.siat_cuis) {
      return NextResponse.json({ error: "Falta el CUIS. Solicite el CUIS primero." }, { status: 400 });
    }

    // 2. Solicitar CUFD
    const response = await solicitarCUFD({
      codigoAmbiente: 2, 
      codigoModalidad: 1, 
      codigoPuntoVenta: parseInt(siatSettings.siat_codigo_punto_venta) || 0,
      codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
      cuis: siatSettings.siat_cuis,
    });

    const codigoCufd = response?.RespuestaCufd?.codigo;
    const fechaVigencia = response?.RespuestaCufd?.fechaVigencia;

    if (!codigoCufd) {
       throw new Error(JSON.stringify(response));
    }

    // 3. Guardar en Supabase
    await supabaseAdmin
      .from('restaurant_siat_settings')
      .update({ 
        siat_cufd: codigoCufd,
        cufd_fecha_vigencia: fechaVigencia
      })
      .eq('restaurant_id', restaurantId);

    return NextResponse.json({
      success: true,
      message: "CUFD obtenido exitosamente.",
      cufd: codigoCufd,
      fechaVigencia: fechaVigencia,
      data: response,
    });
  } catch (error: any) {
    console.error("Error en solicitar CUFD:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al solicitar CUFD al SIAT.",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
