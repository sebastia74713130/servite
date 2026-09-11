import * as soap from 'soap';
async function run() {
  const urls = [
      'https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionRegistroCompras?wsdl',
      'https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompras?wsdl',
      'https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioRecepcionCompras?wsdl',
      'https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionOperaciones?wsdl'
  ];
  for (const url of urls) {
      try {
          const client = await soap.createClientAsync(url);
          console.log(`\n=======================`);
          console.log(`Metodos en ${url}:`);
          const srv = Object.keys(client.describe())[0];
          const port = Object.keys(client.describe()[srv])[0];
          console.log(Object.keys(client.describe()[srv][port]));
          console.log("ConfirmacionCompras:", client.describe()[srv][port].confirmacionCompras?.input);
      } catch (e) {
          console.log(`Error al conectar con WSDL ${url}`);
      }
  }
}
run();
