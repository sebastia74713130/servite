import { createSiatClient } from "../soapClient";
import { siatConfig } from "../config";

export interface SyncRequestParams {
  codigoAmbiente?: number; 
  codigoPuntoVenta?: number; 
  codigoSucursal?: number; 
  cuis?: string;
}

/**
 * Servicio para sincronizar catálogos (ej. Actividades Económicas).
 */
export async function sincronizarActividades(params: SyncRequestParams = {}) {
  const {
    codigoAmbiente = 2,
    codigoPuntoVenta = 0,
    codigoSucursal = 0,
    cuis = process.env.SIAT_CUIS || "",
  } = params;

  if (!cuis) {
    throw new Error("El CUIS es obligatorio para sincronizar catálogos");
  }

  try {
    const client = await createSiatClient(siatConfig.wsdlSincronizacionPiloto);
    
    const solicitudSincronizacion = {
      SolicitudSincronizacion: {
        codigoAmbiente,
        codigoPuntoVenta,
        codigoSistema: siatConfig.codigoSistema,
        codigoSucursal,
        cuis,
        nit: parseInt(siatConfig.nit, 10)
      }
    };

    console.log("Enviando SolicitudSincronizacion...");
    
    const [result] = await client.sincronizarActividadesAsync(solicitudSincronizacion);
    
    return result;
  } catch (error: any) {
    console.error("Error en sincronizarActividades:", error);
    if (error.root && error.root.Envelope) {
        throw new Error(JSON.stringify(error.root.Envelope.Body.Fault));
    }
    throw error;
  }
}
