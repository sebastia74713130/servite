import * as forge from "node-forge";
import { SignedXml } from "xml-crypto";
import * as fs from "fs";
import * as path from "path";
import { siatConfig } from "../config";

/**
 * Lee un archivo .p12 desde un Buffer y extrae la llave privada y el certificado en formato PEM.
 */
export function extractKeysFromP12(p12Buffer: Buffer, password: string) {
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

  let privateKeyPem = "";
  let certPem = "";

  // Extraer los "SafeBags" que contienen la llave y el certificado
  const bags = p12.getBags({bagType: forge.pki.oids.pkcs8ShroudedKeyBag});
  const keyBags = bags[forge.pki.oids.pkcs8ShroudedKeyBag];
  
  const certBagsObj = p12.getBags({bagType: forge.pki.oids.certBag});
  const certBags = certBagsObj[forge.pki.oids.certBag];

  if (keyBags && keyBags.length > 0) {
    const privateKey = keyBags[0].key;
    privateKeyPem = forge.pki.privateKeyToPem(privateKey as forge.pki.PrivateKey);
  } else {
    throw new Error("No se encontró una llave privada en el archivo .p12");
  }

  if (certBags && certBags.length > 0) {
    const cert = certBags[0].cert;
    certPem = forge.pki.certificateToPem(cert as forge.pki.Certificate);
  } else {
    throw new Error("No se encontró un certificado en el archivo .p12");
  }

  return { privateKeyPem, certPem };
}

/**
 * Firma un documento XML en formato string usando XMLDSig (RSA-SHA256).
 */
export function signXml(xmlString: string, privateKeyPem: string, certPem: string): string {
  const sig = new SignedXml();
  
  // SIAT requiere los algoritmos estándar de XMLDSig
  sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
  sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";

  // Añadir la referencia (apunta al documento completo usando enveloped signature)
  sig.addReference({
    xpath: "//*[local-name(.)='facturaElectronicaCompraVenta']",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature", 
      "http://www.w3.org/2001/10/xml-exc-c14n#"
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    isEmptyUri: true
  } as any);

  // Configuramos la llave privada
  sig.privateKey = privateKeyPem;

  // Inyectamos el certificado público
  sig.publicCert = certPem;

  // Computar la firma
  sig.computeSignature(xmlString);
  
  // Retorna el XML original con el nodo <Signature> incrustado
  return sig.getSignedXml();
}
