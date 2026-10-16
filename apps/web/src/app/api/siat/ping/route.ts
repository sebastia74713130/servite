import { NextResponse } from "next/server";
import { verificarComunicacion } from "@/lib/siat/services/verificarComunicacion";
import { siatConfig } from "@/lib/siat/config";

export async function GET() {
  try {
    const response = await verificarComunicacion();
    
    return NextResponse.json({
      success: true,
      ambiente: siatConfig.ambiente === 1 ? 'PRODUCCION' : 'PILOTO',
      codigoAmbiente: siatConfig.ambiente,
      message: "Comunicación con SIAT ejecutada.",
      data: response,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al comunicarse con el SIAT.",
        error: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
