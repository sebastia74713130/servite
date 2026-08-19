const soap = require('soap');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = 'https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl';
  try {
    const client = await soap.createClientAsync(url);
    const token = process.env.SIAT_TOKEN_DELEGADO;
    client.addHttpHeader("apikey", `TokenApi ${token}`);

    const solicitudSincronizacion = {
      SolicitudSincronizacion: {
        codigoAmbiente: 2,
        codigoPuntoVenta: 0,
        codigoSistema: process.env.SIAT_CODIGO_SISTEMA,
        codigoSucursal: 0,
        cuis: process.env.SIAT_CUIS,
        nit: parseInt(process.env.SIAT_NIT, 10)
      }
    };

    console.log("Sincronizando Actividades con CUIS:", process.env.SIAT_CUIS);
    const [result] = await client.sincronizarActividadesAsync(solicitudSincronizacion);
    console.log("Respuesta obtenida con éxito. Cantidad de actividades:", result.RespuestaListaActividades?.listaActividades?.length);
    console.log("Muestra de la primera actividad:", JSON.stringify(result.RespuestaListaActividades?.listaActividades?.[0], null, 2));
  } catch (err) {
    if (err.root && err.root.Envelope) {
        console.error("SOAP Error:", JSON.stringify(err.root.Envelope.Body.Fault, null, 2));
    } else {
        console.error("Error:", err.message);
    }
  }
}

main();
