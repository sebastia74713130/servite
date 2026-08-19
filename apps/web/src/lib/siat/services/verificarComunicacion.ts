import { createSiatClient } from "../soapClient";
import { siatConfig } from "../config";

/**
 * Servicio para verificar la comunicación con el SIAT.
 * Consume el método verificarComunicacion del WSDL de Sincronización.
 */
export async function verificarComunicacion() {
  try {
    const client = await createSiatClient(siatConfig.wsdlSincronizacionPiloto);
    
    // Ejecutamos el método asíncrono que provee el cliente SOAP.
    // El método suele retornar un array, donde el primer elemento es el resultado.
    const [result] = await client.verificarComunicacionAsync({});
    
    return result;
  } catch (error) {
    console.error("Error en verificarComunicacion:", error);
    throw error;
  }
}
