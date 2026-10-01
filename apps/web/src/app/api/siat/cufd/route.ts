import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { solicitarCUFD } from "@/lib/siat/services/solicitarCUFD";
import { siatConfig } from "@/lib/siat/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, branchId } = body;

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
      .select('siat_codigo_sucursal, siat_codigo_punto_venta, siat_cuis')
      .eq('id', branchId)
      .single();

    if (branchError || !branchData) {
      return NextResponse.json({ error: "No se encontró la configuración de la sucursal" }, { status: 404 });
    }

    if (!branchData.siat_cuis) {
      return NextResponse.json({ error: "Falta el CUIS. Solicite el CUIS primero." }, { status: 400 });
    }

    // 2. Solicitar CUFD
    const response = await solicitarCUFD({
      codigoAmbiente: siatConfig.ambiente, 
      codigoModalidad: 1, 
      codigoPuntoVenta: parseInt(branchData.siat_codigo_punto_venta) || 0,
      codigoSucursal: parseInt(branchData.siat_codigo_sucursal) || 0,
      cuis: branchData.siat_cuis,
      nit: parseInt(siatSettings.siat_nit, 10),
    });

    const codigoCufd = response?.RespuestaCufd?.codigo;
    const fechaVigencia = response?.RespuestaCufd?.fechaVigencia;
    const codigoControl = response?.RespuestaCufd?.codigoControl;

    if (!codigoCufd) {
       throw new Error(JSON.stringify(response));
    }

    // 3. Guardar en Supabase
    await supabaseAdmin
      .from('branches')
      .update({ 
        siat_cufd: codigoCufd,
        cufd_fecha_vigencia: fechaVigencia,
        siat_codigo_control_cufd: codigoControl
      })
      .eq('id', branchId);

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
