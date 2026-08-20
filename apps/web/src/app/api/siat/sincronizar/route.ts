import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sincronizarCatalogosSIAT } from "@/lib/siat/services/sincronizarCatalogos";
import { siatConfig } from "@/lib/siat/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: "Falta el ID del restaurante" }, { status: 400 });
    }

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

    const catalogos = await sincronizarCatalogosSIAT({
      codigoAmbiente: 2,
      codigoPuntoVenta: parseInt(siatSettings.siat_codigo_punto_venta) || 0,
      codigoSistema: siatConfig.codigoSistema,
      codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
      cuis: siatSettings.siat_cuis,
      nit: parseInt(siatSettings.siat_nit, 10),
    });

    await supabaseAdmin
      .from('restaurant_siat_settings')
      .update({
        siat_actividad_economica: catalogos.actividad.toString(),
        siat_codigo_producto_sin: parseInt(catalogos.producto)
      })
      .eq('restaurant_id', restaurantId);

    return NextResponse.json({
      success: true,
      message: "Catálogos sincronizados exitosamente.",
      actividad: catalogos.actividad,
      producto: catalogos.producto
    });

  } catch (error: any) {
    console.error("Error en sincronizar catálogos:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al sincronizar catálogos.",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
