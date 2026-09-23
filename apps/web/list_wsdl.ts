import * as soap from "soap";

async function main() {
    const wsdl = "https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl";
    try {
        const client = await soap.createClientAsync(wsdl);
        console.log(JSON.stringify(client.describe(), null, 2));
    } catch(e: any) {
        console.log("Error:", e.message);
    }
}
main();
