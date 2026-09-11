import { NextResponse } from "next/server";
import * as soap from "soap";
import { siatConfig } from "@/lib/siat/config";

export async function GET() {
  try {
    const client = await soap.createClientAsync(siatConfig.wsdlSincronizacion);
    const allMethods = Object.keys(client.describe().ServicioFacturacionSincronizacion.ServicioFacturacionSincronizacionPort);
    
    // Filtramos solo los de sincronizar
    const syncMethods = allMethods.filter(m => m.startsWith('sincronizar') || m === 'verificarComunicacion');
    
    return NextResponse.json({ success: true, methods: syncMethods });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
