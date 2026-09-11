const soap = require('soap');

async function test() {
  const url = 'https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioRecepcionCompras?wsdl';
  const client = await soap.createClientAsync(url);
  console.log(JSON.stringify(client.describe(), null, 2));
}

test();
