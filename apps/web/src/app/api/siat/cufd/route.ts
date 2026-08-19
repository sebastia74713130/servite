import { NextResponse } from "next/server";
import { solicitarCUFD } from "@/lib/siat/services/solicitarCUFD";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigoPuntoVenta = searchParams.get("codigoPuntoVenta") 
      ? parseInt(searchParams.get("codigoPuntoVenta") as string, 10) 
      : 0;
      
    // En producción, el CUIS debería leerse de la base de datos (Supabase)
    const cuis = searchParams.get("cuis") || process.env.SIAT_CUIS;

    if (!cuis) {
      return NextResponse.json({ success: false, message: "Falta el CUIS" }, { status: 400 });
    }

    const response = await solicitarCUFD({
      codigoAmbiente: 2, 
      codigoModalidad: 1, 
      codigoPuntoVenta,
      codigoSucursal: 0,
      cuis,
    });
    
    return NextResponse.json({
      success: true,
      message: "CUFD obtenido exitosamente.",
      data: response,
    });
  } catch (error: any) {
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
