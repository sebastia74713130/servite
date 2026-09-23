import * as soap from "soap";

async function main() {
    const wsdl = "https://pilotosiatservicios.impuestos.gob.bo/v2/OperacionesFacturacionCompraVenta?wsdl";
    try {
        const client = await soap.createClientAsync(wsdl);
        console.log(Object.keys(client.describe().ServicioOperaciones.ServicioOperacionesHttpSoap11Endpoint));
    } catch(e: any) {
        console.log("Error:", e.message);
    }
}
main();
