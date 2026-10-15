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

    // Delegar sincronización al microservicio
    const resp = await tendaiApiClient.sincronizarCatalogos(sucursal, puntoVenta, apiKey);

    if (!resp.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Error al sincronizar catálogos",
          error: resp.error || resp.message || "Fallo al comunicar con SIAT",
        },
        { status: 500 }
      );
    }

    const actividad = resp.data?.actividad || resp.data?.actividades?.[0]?.codigoCaeb || siatSettings?.siat_actividad_economica || "6201000";
    const producto = resp.data?.producto || resp.data?.productos?.[0]?.codigoProducto || siatSettings?.siat_codigo_producto_sin || 1003913;

    await supabaseAdmin
      .from('restaurant_siat_settings')
      .update({
        siat_actividad_economica: actividad.toString(),
        siat_codigo_producto_sin: parseInt(producto, 10) || 1003913,
      })
      .eq('restaurant_id', restaurantId);

    return NextResponse.json({
      success: true,
      message: "Catálogos sincronizados exitosamente.",
      actividad,
      producto,
      data: resp.data,
    });

  } catch (error: any) {
    console.error("Error en /api/siat/sincronizar:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al sincronizar catálogos",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
