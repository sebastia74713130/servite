import { extractKeysFromP12, signXml } from "./src/lib/siat/crypto/signer";

async function main() {
  try {
    console.log("Probando extracción de .p12...");
    const keys = extractKeysFromP12("certs/softoken.p12", "Aleida25007566");
    console.log("✅ Llave Privada y Certificado extraídos correctamente.");
    
    // Un XML mínimo de prueba
    const xmlPrueba = `<facturaComputarizadaEstandar xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><cabecera><nitEmisor>698777025</nitEmisor></cabecera></facturaComputarizadaEstandar>`;
    
    console.log("Probando XMLDSig...");
    const signedXml = signXml(xmlPrueba, keys.privateKeyPem, keys.certPem);
    
    if (signedXml.includes("<Signature")) {
      console.log("✅ XML Firmado Exitosamente.");
      console.log("=== XML FIRMADO ===");
      console.log(signedXml);
    } else {
      console.error("Fallo la inyección de la firma");
    }
  } catch (error) {
    console.error("Error en la prueba:", error);
  }
}

main();
