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
  console.log("=== SINCRONIZAR ACTIVIDADES DOCUMENTO SECTOR (50 PRUEBAS) ===");

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const syncClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl');
  syncClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const [cuisRes] = await codigosClient.cuisAsync({
      SolicitudCuis: {
          codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 0,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10)
      }
  });
  
  const validCuis = cuisRes.RespuestaCuis?.codigo;
  if (!validCuis) throw new Error("Fallo al obtener CUIS inicial");

  const baseReq = {
      codigoAmbiente: 2, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA,
      codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10), cuis: validCuis
  };

  let successCount = 0;
  for (let i = 1; i <= 50; i++) {
      try {
          await syncClient.sincronizarListaActividadesDocumentoSectorAsync({ SolicitudSincronizacion: baseReq });
          successCount++;
          process.stdout.write(`Prueba ${successCount}/50 OK... `);
      } catch(e) {
          process.stdout.write(`Prueba ${i}/50 FAIL... `);
      }
      await delay(200);
  }
  
  console.log("\\n=== FINALIZADO ===");
}

run().catch(console.error);
