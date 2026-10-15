import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveBranchId } from "@/lib/siat/branchHelper";
import { tendaiApiClient } from "@/lib/siat/tendaiApiClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, overridePuntoVenta } = body;
    const branchId = await resolveBranchId(restaurantId, body.branchId);

    if (!restaurantId) {
      return NextResponse.json({ error: "Falta el ID del restaurante" }, { status: 400 });
    }

    // 1. Obtener la configuración del SIAT del restaurante
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

    const pv = overridePuntoVenta !== undefined ? Number(overridePuntoVenta) : puntoVenta;
    const apiKey = siatSettings?.siat_api_key || process.env.FACTURACION_API_KEY;

    // 2. Solicitar CUIS al microservicio
    const resp = await tendaiApiClient.sincronizarCuis(sucursal, pv, apiKey);

    if (!resp.success || !resp.data?.cuis) {
      return NextResponse.json(
        {
          success: false,
          message: "Error al solicitar CUIS al SIAT",
          error: resp.error || resp.message || "Fallo en la respuesta del microservicio",
          detalles: resp.detalles,
        },
        { status: 500 }
      );
    }

    const { cuis, fechaVigencia } = resp.data;

    // 3. Persistir en la base de datos local
    if (overridePuntoVenta === undefined) {
      if (branchId) {
        await supabaseAdmin
          .from('branches')
          .update({ siat_cuis: cuis })
          .eq('id', branchId);
      }

      await supabaseAdmin
        .from('restaurant_siat_settings')
        .update({ siat_cuis: cuis })
        .eq('restaurant_id', restaurantId);
    }

    return NextResponse.json({
      success: true,
      message: "CUIS obtenido exitosamente.",
      cuis,
      fechaVigencia,
    });
  } catch (error: any) {
    console.error("Error en /api/siat/cuis:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al solicitar CUIS",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
