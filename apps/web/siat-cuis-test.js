const soap = require('soap');

async function main() {
  const url = 'https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl';
  try {
    const client = await soap.createClientAsync(url);
    const description = client.describe();
    console.log(JSON.stringify(description.ServicioFacturacionCodigos.ServicioFacturacionCodigosPort.cuis, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
