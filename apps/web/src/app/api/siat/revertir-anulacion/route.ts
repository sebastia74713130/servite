import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { tendaiApiClient } from "@/lib/siat/tendaiApiClient";

export async function POST(req: Request) {
  try {
    const { restaurantId, cuf } = await req.json();

    if (!restaurantId || !cuf) {
      return NextResponse.json({ error: "Faltan parámetros requeridos: restaurantId y cuf" }, { status: 400 });
    }

    const { data: siatSettings } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('siat_api_key')
      .eq('restaurant_id', restaurantId)
      .single();

    const apiKey = siatSettings?.siat_api_key || process.env.FACTURACION_API_KEY;

    // Delegar reversión al microservicio
    const resp = await tendaiApiClient.revertirAnulacion(cuf, apiKey);

    if (resp.success) {
      // Actualizar estado local
      await supabaseAdmin
        .from('invoices')
        .update({
          siat_estado: 'VALIDADA',
          detalles_error: 'Reversión de anulación exitosa ante el SIAT',
        })
        .eq('cuf', cuf);

      return NextResponse.json({
        success: true,
        message: resp.message || "Reversión de anulación exitosa",
        cuf,
      });
    }

    return NextResponse.json({
      success: false,
      error: resp.error || "Rechazo del SIAT al revertir anulación",
      detalles: resp.detalles,
    }, { status: 400 });

  } catch (error: any) {
    console.error("Error al revertir anulación:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Error interno al revertir anulación" 
    }, { status: 500 });
  }
}
