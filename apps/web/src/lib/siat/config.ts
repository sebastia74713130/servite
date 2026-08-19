export const siatConfig = {
  tokenDelegado: process.env.SIAT_TOKEN_DELEGADO || "",
  codigoSistema: process.env.SIAT_CODIGO_SISTEMA || "",
  nit: process.env.SIAT_NIT || "",
  certPath: process.env.SIAT_CERT_PATH || "",
  certPassword: process.env.SIAT_CERT_PASSWORD || "",
  
  // WSDL del ambiente Piloto para Sincronización
  wsdlSincronizacionPiloto: "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl",
  
  // WSDL del ambiente Piloto para Facturación Electrónica en Línea
  wsdlOperacionesPiloto: "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl",
  
  // WSDL del ambiente Piloto para Códigos (CUIS, CUFD)
  wsdlCodigosPiloto: "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl"
};
