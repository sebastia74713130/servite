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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function createClientWithRetry(url: string, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await soap.createClientAsync(url);
    } catch (e) {
      await delay(2000);
    }
  }
  throw new Error(`Fallo fatal al conectar con WSDL ${url}`);
}

async function run() {
  console.log("=== INICIANDO ETAPAS I, II y III ===");

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const syncClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl');
  syncClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  // ETAPA I: OBTENCIÓN DE CUIS
  console.log("\\n--- ETAPA I: CUIS ---");
  for (const pv of [0, 1]) {
      const [res] = await codigosClient.cuisAsync({
          SolicitudCuis: {
              codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
              codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10)
          }
      });
      console.log(`CUIS PV ${pv}:`, res.RespuestaCuis?.codigo);
  }

  // ETAPA II: SINCRONIZACIÓN DE CATÁLOGOS
  console.log("\\n--- ETAPA II: SINCRONIZACIÓN (1800 CASOS) ---");
  const baseReq = {
      codigoAmbiente: 2, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA,
      codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10), cuis: ""
  };
  
  const [cuisRes] = await codigosClient.cuisAsync({
      SolicitudCuis: {
          codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 0,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10)
      }
  });
  const validCuis = cuisRes.RespuestaCuis?.codigo;
  if (!validCuis) throw new Error("Fallo al obtener CUIS inicial");
  baseReq.cuis = validCuis;

  const syncMethods = [
      'sincronizarActividades', 'sincronizarFechaHora', 'sincronizarListaLeyendasFactura',
      'sincronizarListaMensajesServicios', 'sincronizarListaProductosServicios',
      'sincronizarParametricaEventosSignificativos', 'sincronizarParametricaMotivoAnulacion',
      'sincronizarParametricaPaisOrigen', 'sincronizarParametricaTipoDocumentoIdentidad',
      'sincronizarParametricaTipoDocumentoSector', 'sincronizarParametricaTipoEmision',
      'sincronizarParametricaTipoHabitacion', 'sincronizarParametricaTipoMetodoPago',
      'sincronizarParametricaTipoMoneda', 'sincronizarParametricaTipoPuntoVenta',
      'sincronizarParametricaTiposFactura', 'sincronizarParametricaUnidadMedida'
  ];

  let syncCount = 0;
  for (let iter = 1; iter <= 106; iter++) {
      for (const method of syncMethods) {
          try {
              await syncClient[method + 'Async']({ SolicitudSincronizacion: baseReq });
              syncCount++;
              if (syncCount % 100 === 0) process.stdout.write(`Sync ${syncCount}/1800... `);
          } catch(e) {}
      }
      await delay(200);
  }
  console.log(`\\nTotal Sync completados: ${syncCount}`);

  // ETAPA III: OBTENCIÓN CUFD
  console.log("\\n--- ETAPA III: CUFD ---");
  const [cuisRes1] = await codigosClient.cuisAsync({
      SolicitudCuis: {
          codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 1,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10)
      }
  });
  const validCuis1 = cuisRes1.RespuestaCuis?.codigo;

  let cufdCount = 0;
  for (let i = 1; i <= 105; i++) {
      for (const pv of [0, 1]) {
          try {
              const currentCuis = pv === 0 ? validCuis : validCuis1;
              const [res] = await codigosClient.cufdAsync({
                  SolicitudCufd: {
                      codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
                      codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: currentCuis, nit: parseInt(envVars.SIAT_NIT, 10)
                  }
              });
              if (res.RespuestaCufd?.transaccion) cufdCount++;
              if (cufdCount % 20 === 0) process.stdout.write(`CUFD ${cufdCount}/200... `);
          } catch(e) {}
      }
  }
  console.log(`\\nTotal CUFD completados: ${cufdCount}`);

  console.log("\\n=== ETAPAS I, II y III COMPLETADAS ===");
}

run().catch(console.error);
