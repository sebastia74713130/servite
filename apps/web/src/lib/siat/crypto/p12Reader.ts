import * as forge from "node-forge";
import * as fs from "fs";
import * as path from "path";

export interface ExtractedKeys {
  privateKeyPem: string;
  certPem: string;
}

/**
 * Lee un archivo .p12 y extrae la llave privada y el certificado público en formato PEM.
 * Requerido por xml-crypto para firmar el XML.
 */
export function extractKeysFromP12(p12Path: string, p12Password: string): ExtractedKeys {
  try {
    // Resolver ruta absoluta. Asumimos que la ruta base es la raíz de apps/web
    const absolutePath = path.resolve(process.cwd(), p12Path);
    const p12Buffer = fs.readFileSync(absolutePath);
    
    // Convertir buffer a string binario para node-forge
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, p12Password);

    let privateKeyPem = "";
    let certPem = "";

    // Extraer bolsas seguras (safe bags)
    const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

    // 1. Obtener la llave privada
    const keyBagArray = bags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (keyBagArray && keyBagArray.length > 0) {
      const privateKey = keyBagArray[0].key;
      if (privateKey) {
        privateKeyPem = forge.pki.privateKeyToPem(privateKey);
      }
    }

    // 2. Obtener el certificado público
    const certBagArray = certBags[forge.pki.oids.certBag];
    if (certBagArray && certBagArray.length > 0) {
      const cert = certBagArray[0].cert;
      if (cert) {
        certPem = forge.pki.certificateToPem(cert);
      }
    }

    if (!privateKeyPem || !certPem) {
      throw new Error("No se pudo extraer la llave privada o el certificado del archivo .p12");
    }

    return { privateKeyPem, certPem };
  } catch (error) {
    console.error("Error al extraer llaves del P12:", error);
    throw error;
  }
}
