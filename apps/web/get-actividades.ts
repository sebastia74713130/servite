import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) {
    let cleanVal = val.join('=').trim();
    if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
        cleanVal = cleanVal.slice(1, -1);
    }
    envVars[key.trim()] = cleanVal;
  }
});

async function run() {
  const codigosClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const syncClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl');
  syncClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const [cuisResult] = await codigosClient.cuisAsync({ SolicitudCuis: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10) }});
  const cuis = cuisResult.RespuestaCuis?.codigo;

  const [actividades] = await syncClient.sincronizarActividadesAsync({
      SolicitudSincronizacion: { codigoAmbiente: 2, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10) }
  });

  const listaActividades = actividades.RespuestaListaActividades?.listaActividades;
  console.log("ACTIVIDADES PERMITIDAS PARA ESTE NIT:");
  console.log(JSON.stringify(listaActividades, null, 2));

  const [productos] = await syncClient.sincronizarListaProductosServiciosAsync({
      SolicitudSincronizacion: { codigoAmbiente: 2, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10) }
  });

  const listaProductos = productos.RespuestaListaProductos?.listaCodigos;
  console.log("PRODUCTOS PERMITIDOS (primeros 5):");
  console.log(JSON.stringify(Array.isArray(listaProductos) ? listaProductos.slice(0,5) : listaProductos, null, 2));
}

run();
