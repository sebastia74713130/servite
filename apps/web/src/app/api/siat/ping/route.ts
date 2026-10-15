import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { tendaiApiClient } from "@/lib/siat/tendaiApiClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    let apiKey = process.env.FACTURACION_API_KEY;

    if (restaurantId) {
      const { data: siatSettings } = await supabaseAdmin
        .from('restaurant_siat_settings')
        .select('siat_api_key')
        .eq('restaurant_id', restaurantId)
        .single();

      if (siatSettings?.siat_api_key) {
        apiKey = siatSettings.siat_api_key;
      }
    }

    const response = await tendaiApiClient.pingSiat(apiKey);

    if (response.success) {
      return NextResponse.json({
        success: true,
        message: response.message || "Comunicación con SIAT exitosa.",
        ambiente: response.ambiente,
        data: response.data,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: response.message || "Error al comunicarse con el SIAT.",
        error: response.error,
        detalles: response.data,
      },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al comunicarse con el microservicio SIAT.",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
