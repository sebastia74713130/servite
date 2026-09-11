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
    if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) { cleanVal = cleanVal.slice(1, -1); }
    envVars[key.trim()] = cleanVal;
  }
});

async function run() {
  console.log("Conectando con FacturacionSincronizacion...");
  const syncClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl');
  syncClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const codigosClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  // Obtener CUIS temporalmente
  const [cuisResult] = await codigosClient.cuisAsync({
      SolicitudCuis: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10) }
  });
  const cuis = cuisResult.RespuestaCuis.codigo;

  console.log("Obteniendo catálogo de eventos...");
  const [syncResult] = await syncClient.sincronizarParametricaEventosSignificativosAsync({
      SolicitudSincronizacion: { codigoAmbiente: 2, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, codigoPuntoVenta: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10) }
  });

  const eventos = syncResult.RespuestaListaParametricas.listaCodigos;
  console.log("\n=== CATÁLOGO OFICIAL DE EVENTOS SIGNIFICATIVOS SIAT ===");
  eventos.forEach((ev: any) => {
      console.log(`Motivo ID: ${ev.codigoClasificador} -> ${ev.descripcion}`);
  });
}

run();
