const soap = require('soap');

async function test() {
  const url = 'https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl';
  const client = await soap.createClientAsync(url);
  console.log(Object.keys(client.describe().ServicioFacturacionSincronizacion.ServicioFacturacionSincronizacionPort));
  console.log(JSON.stringify(client.describe().ServicioFacturacionSincronizacion.ServicioFacturacionSincronizacionPort.sincronizarActividadesDocumentoSector.input, null, 2));
}
test();
