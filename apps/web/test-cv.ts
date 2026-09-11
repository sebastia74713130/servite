import * as soap from 'soap';
async function run() {
  const client = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  console.log("Metodos CompraVenta:");
  console.log(Object.keys(client.describe().ServicioFacturacion.ServicioFacturacionPort));
}
run();
