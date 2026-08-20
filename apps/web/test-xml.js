const { SignedXml } = require('xml-crypto');
const xml = '<facturaElectronicaCompraVenta><cabecera>a</cabecera></facturaElectronicaCompraVenta>';

const sig2 = new SignedXml();
sig2.privateKey = require('crypto').generateKeyPairSync('rsa', {modulusLength: 2048}).privateKey.export({type: 'pkcs1', format: 'pem'});
sig2.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
sig2.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
sig2.addReference({
  xpath: "//*[local-name(.)='facturaElectronicaCompraVenta']",
  transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/2001/10/xml-exc-c14n#"],
  digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
  isEmptyUri: true
});
sig2.computeSignature(xml);
console.log(sig2.getSignedXml());
