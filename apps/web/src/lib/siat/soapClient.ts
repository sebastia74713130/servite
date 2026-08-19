import * as soap from "soap";
import { siatConfig } from "./config";

/**
 * Crea y configura un cliente SOAP genérico para interactuar con el SIAT.
 * Añade automáticamente el Token Delegado en las cabeceras HTTP.
 * 
 * @param wsdlUrl La URL del WSDL al que conectarse.
 */
export async function createSiatClient(wsdlUrl: string) {
  try {
    const client = await soap.createClientAsync(wsdlUrl);
    
    // El SIAT requiere el Token Delegado (apikey) en los headers HTTP
    client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);
    
    return client;
  } catch (error) {
    console.error("Error al crear el cliente SOAP del SIAT:", error);
    throw error;
  }
}
