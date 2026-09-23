import * as soap from "soap";
async function main() {
    const wsdl = "https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl";
    const client = await soap.createClientAsync(wsdl);
    const service = client.describe().ServicioFacturacion;
    const portName = Object.keys(service)[0];
    console.log(Object.keys(service[portName]));
}
main();
