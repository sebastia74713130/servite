import * as soap from 'soap';
async function run() {
  const client = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  const methods = client.describe().ServicioFacturacion.ServicioFacturacionPort;
  console.log("Parametros reversionAnulacionFactura:");
  console.log(methods.reversionAnulacionFactura.input);
}
run();
