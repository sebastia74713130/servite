import * as soap from 'soap';
async function run() {
  const opsClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl');
  console.log("Metodos Operaciones:");
  console.log(Object.keys(opsClient.describe().ServicioFacturacionOperaciones.ServicioFacturacionOperacionesPort));
}
run();
