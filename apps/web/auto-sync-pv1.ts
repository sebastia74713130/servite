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
  console.log("=== INICIANDO SINCRONIZACIÓN ETAPA II PARA PV 1 (900 CASOS) ===");

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const syncClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl');
  syncClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const [cuisRes] = await codigosClient.cuisAsync({
      SolicitudCuis: {
          codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 1,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10)
      }
  });
  const validCuis1 = cuisRes.RespuestaCuis?.codigo;
  if (!validCuis1) throw new Error("Fallo al obtener CUIS inicial para PV 1");

  const baseReq = {
      codigoAmbiente: 2, codigoPuntoVenta: 1, codigoSistema: envVars.SIAT_CODIGO_SISTEMA,
      codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10), cuis: validCuis1
  };

  const syncMethods = [
      'sincronizarActividades', 'sincronizarFechaHora', 'sincronizarListaLeyendasFactura',
      'sincronizarListaMensajesServicios', 'sincronizarListaProductosServicios',
      'sincronizarParametricaEventosSignificativos', 'sincronizarParametricaMotivoAnulacion',
      'sincronizarParametricaPaisOrigen', 'sincronizarParametricaTipoDocumentoIdentidad',
      'sincronizarParametricaTipoDocumentoSector', 'sincronizarParametricaTipoEmision',
      'sincronizarParametricaTipoHabitacion', 'sincronizarParametricaTipoMetodoPago',
      'sincronizarParametricaTipoMoneda', 'sincronizarParametricaTipoPuntoVenta',
      'sincronizarParametricaTiposFactura', 'sincronizarParametricaUnidadMedida',
      'sincronizarListaActividadesDocumentoSector'
  ];

  let syncCount = 0;
  for (let iter = 1; iter <= 50; iter++) {
      for (const method of syncMethods) {
          try {
              await syncClient[method + 'Async']({ SolicitudSincronizacion: baseReq });
              syncCount++;
              if (syncCount % 50 === 0) process.stdout.write(`Sync PV1 ${syncCount}/900... `);
          } catch(e) {}
      }
      await delay(200);
  }
  
  console.log(`\\nTotal Sync completados para PV 1: ${syncCount}`);
  console.log("\\n=== ETAPA II PARA PV 1 COMPLETADA ===");
}

run().catch(console.error);
