import * as soap from "soap";
import { siatConfig } from "./config";

/**
 * Crea y configura un cliente SOAP genérico para interactuar con el SIAT.
 * Añade automáticamente el Token Delegado en las cabeceras HTTP.
 * 
 * @param wsdlUrl La URL del WSDL al que conectarse.
 */
export async function createSiatClient(wsdlUrl: string, tokenDelegado?: string) {
  try {
    const client = await soap.createClientAsync(wsdlUrl);
    
    // El SIAT requiere el Token Delegado (apikey) en los headers HTTP
    const token = tokenDelegado || siatConfig.tokenDelegado;
    client.addHttpHeader("apikey", `TokenApi ${token}`);
    
    return client;
  } catch (error) {
    console.error("Error al crear el cliente SOAP del SIAT:", error);
    throw error;
  }
}
