import { NextResponse } from "next/server";
import { solicitarCUIS } from "@/lib/siat/services/solicitarCUIS";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigoPuntoVenta = searchParams.get("codigoPuntoVenta") 
      ? parseInt(searchParams.get("codigoPuntoVenta") as string, 10) 
      : 0;

    const response = await solicitarCUIS({
      codigoAmbiente: 2, // Piloto
      codigoModalidad: 1, // Electrónica en Línea
      codigoPuntoVenta,
      codigoSucursal: 0,
    });
    
    return NextResponse.json({
      success: true,
      message: "CUIS obtenido exitosamente.",
      data: response,
    });
  } catch (error: any) {
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
