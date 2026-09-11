export const siatConfig = {
  tokenDelegado: process.env.SIAT_TOKEN_DELEGADO || "",
  codigoSistema: process.env.SIAT_CODIGO_SISTEMA || "",
  nit: process.env.SIAT_NIT || "",
  certPath: process.env.SIAT_CERT_PATH || "",
  certPassword: process.env.SIAT_CERT_PASSWORD || "",
  ambiente: process.env.SIAT_AMBIENTE ? parseInt(process.env.SIAT_AMBIENTE, 10) : 2,
  
  get wsdlSincronizacion() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl";
  },
  
  get wsdlOperaciones() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl";
  },
  
  get wsdlCodigos() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/FacturacionCodigos?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl";
  },

  get wsdlCompraVenta() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl";
  }
};
