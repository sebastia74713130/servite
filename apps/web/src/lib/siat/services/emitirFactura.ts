import * as soap from "soap";
import * as zlib from "zlib";
import * as crypto from "crypto";
import { siatConfig } from "../config";

/**
 * Servicio para emitir la factura electrónica en línea enviando el XML firmado.
 * Convierte el XML a GZIP, genera su Hash SHA256 y lo manda por SOAP.
 */
export async function emitirFacturaSIAT(xmlFirmado: string, siatSettings: any) {
  try {
    // 1. Comprimir en GZIP
    const xmlBuffer = Buffer.from(xmlFirmado, "utf-8");
    const gzipBuffer = zlib.gzipSync(xmlBuffer);

    // 2. Calcular Hash SHA256 del archivo GZIP
    const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");

    // 3. Convertir el GZIP a Base64 para enviarlo en el payload SOAP
    const archivoBase64 = gzipBuffer.toString("base64");

    // Formato de fecha esperado por SIAT (YYYY-MM-DDTHH:mm:ss.SSS)
    const fechaEnvio = new Date().toISOString().replace('Z', '');

    // 4. Construir el Payload
    const args = {
      SolicitudServicioRecepcionFactura: {
        codigoAmbiente: 2, // 2 = Piloto
        codigoDocumentoSector: 1, // 1 = Compra Venta
        codigoEmision: 1, // 1 = Online, 2 = Offline
        codigoModalidad: 1, // 1 = Electrónica en Línea, 2 = Computarizada
        codigoPuntoVenta: parseInt(siatSettings.siat_codigo_punto_venta) || 0,
        codigoSistema: siatConfig.codigoSistema,
        codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
        cufd: siatSettings.siat_cufd,
        cuis: siatSettings.siat_cuis,
        nit: parseInt(siatSettings.siat_nit),
        tipoFacturaDocumento: 1, // 1 = Factura con derecho a crédito fiscal
        archivo: archivoBase64,
        fechaEnvio: fechaEnvio,
        hashArchivo: hashArchivo
      }
    };

    // 5. Crear cliente SOAP
    const client = await soap.createClientAsync(siatConfig.wsdlCompraVentaPiloto);
    
    // Configurar Token de API
    client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);

    // 6. Enviar la factura al SIAT
    const [result] = await client.recepcionFacturaAsync(args);
    
    return result;

  } catch (error: any) {
    console.error("Error en emitirFacturaSIAT:", error);
    if (error.response && error.response.data) {
      console.error("Detalle del error SOAP:", error.response.data);
    }
    throw new Error(error.message || "Fallo en la comunicación con SIAT");
  }
}
