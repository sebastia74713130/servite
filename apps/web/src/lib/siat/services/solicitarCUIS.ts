import { createSiatClient } from "../soapClient";
import { siatConfig } from "../config";

export interface CuisRequestParams {
  codigoAmbiente?: number; // 1 = Producción, 2 = Piloto
  codigoModalidad?: number; // 1 = Electrónica en Línea, 2 = Computarizada en Línea
  codigoPuntoVenta?: number; // 0 = Casa Matriz
  codigoSucursal?: number; // 0 = Principal
  nit: number; // NIT del contribuyente
}

/**
 * Servicio para solicitar el CUIS (Código Único de Inicio de Sistema).
 * Obligatorio para realizar cualquier otra operación en el SIAT.
 */
export async function solicitarCUIS(params: CuisRequestParams) {
  const {
    codigoAmbiente = 2, // Por defecto Piloto
    codigoModalidad = 1, // Por defecto Electrónica en Línea
    codigoPuntoVenta = 0,
    codigoSucursal = 0,
  } = params;

  try {
    const client = await createSiatClient(siatConfig.wsdlCodigosPiloto);
    
    const solicitudCuis = {
      SolicitudCuis: {
        codigoAmbiente,
        codigoModalidad,
        codigoPuntoVenta,
        codigoSistema: siatConfig.codigoSistema,
        codigoSucursal,
        nit: params.nit
      }
    };

    console.log("Enviando SolicitudCuis:", solicitudCuis);
    
    // Llamar al método SOAP 'cuis'
    const [result] = await client.cuisAsync(solicitudCuis);
    
    return result;
  } catch (error: any) {
    console.error("Error en solicitarCUIS:", error);
    // Extraer detalles útiles del error SOAP si existen
    if (error.root && error.root.Envelope) {
        throw new Error(JSON.stringify(error.root.Envelope.Body.Fault));
    }
    throw error;
  }
}
