import { createSiatClient } from "../soapClient";
import { siatConfig } from "../config";

export interface CufdRequestParams {
  codigoAmbiente?: number; 
  codigoModalidad?: number; 
  codigoPuntoVenta?: number; 
  codigoSucursal?: number; 
  cuis?: string;
}

/**
 * Servicio para solicitar el CUFD (Código Único de Facturación Diario).
 * Este código caduca cada 24 horas y es obligatorio para emitir facturas.
 */
export async function solicitarCUFD(params: CufdRequestParams = {}) {
  const {
    codigoAmbiente = 2,
    codigoModalidad = 1,
    codigoPuntoVenta = 0,
    codigoSucursal = 0,
    cuis = process.env.SIAT_CUIS || "",
  } = params;

  if (!cuis) {
    throw new Error("El CUIS es obligatorio para solicitar el CUFD");
  }

  try {
    const client = await createSiatClient(siatConfig.wsdlCodigosPiloto);
    
    const solicitudCufd = {
      SolicitudCufd: {
        codigoAmbiente,
        codigoModalidad,
        codigoPuntoVenta,
        codigoSistema: siatConfig.codigoSistema,
        codigoSucursal,
        cuis,
        nit: parseInt(siatConfig.nit, 10)
      }
    };

    console.log("Enviando SolicitudCufd...");
    
    const [result] = await client.cufdAsync(solicitudCufd);
    
    return result;
  } catch (error: any) {
    console.error("Error en solicitarCUFD:", error);
    if (error.root && error.root.Envelope) {
        throw new Error(JSON.stringify(error.root.Envelope.Body.Fault));
    }
    throw error;
  }
}
