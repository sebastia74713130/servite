import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveBranchId } from "@/lib/siat/branchHelper";
import { tendaiApiClient } from "@/lib/siat/tendaiApiClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId } = body;
    const branchId = await resolveBranchId(restaurantId, body.branchId);

    if (!restaurantId) {
      return NextResponse.json({ error: "Falta el ID del restaurante" }, { status: 400 });
    }

    // 1. Obtener ajustes del restaurante
    const { data: siatSettings } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    let sucursal = siatSettings?.siat_codigo_sucursal || 0;
    let puntoVenta = siatSettings?.siat_codigo_punto_venta || 0;

    if (branchId) {
      const { data: branchData } = await supabaseAdmin
        .from('branches')
        .select('siat_codigo_sucursal, siat_codigo_punto_venta')
        .eq('id', branchId)
        .single();

      if (branchData) {
        if (branchData.siat_codigo_sucursal !== null && branchData.siat_codigo_sucursal !== undefined) {
          sucursal = parseInt(branchData.siat_codigo_sucursal, 10) || 0;
        }
        if (branchData.siat_codigo_punto_venta !== null && branchData.siat_codigo_punto_venta !== undefined) {
          puntoVenta = parseInt(branchData.siat_codigo_punto_venta, 10) || 0;
        }
      }
    }

    const apiKey = siatSettings?.siat_api_key || process.env.FACTURACION_API_KEY;
    const force = body.force !== undefined ? Boolean(body.force) : true;

    // 2. Solicitar CUFD al microservicio
    const resp = await tendaiApiClient.sincronizarCufd(sucursal, puntoVenta, apiKey, force);

    if (!resp.success || !resp.data?.cufd) {
      return NextResponse.json(
        {
          success: false,
          message: "Error al solicitar CUFD al SIAT",
          error: resp.error || resp.message || "Fallo en la respuesta del microservicio",
          detalles: resp.detalles,
        },
        { status: 500 }
      );
    }

    const { cufd, codigoControl, fechaVigencia } = resp.data;

    // 3. Persistir en la base de datos local
    if (branchId) {
      await supabaseAdmin
        .from('branches')
        .update({ 
          siat_cufd: cufd,
          cufd_fecha_vigencia: fechaVigencia,
          siat_codigo_control_cufd: codigoControl
        })
        .eq('id', branchId);
    }

    await supabaseAdmin
      .from('restaurant_siat_settings')
      .update({ 
        siat_cufd: cufd,
        cufd_fecha_vigencia: fechaVigencia,
        siat_codigo_control_cufd: codigoControl
      })
      .eq('restaurant_id', restaurantId);

    return NextResponse.json({
      success: true,
      message: "CUFD obtenido exitosamente.",
      cufd,
      fechaVigencia,
      codigoControl,
    });
  } catch (error: any) {
    console.error("Error en /api/siat/cufd:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al solicitar CUFD",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
