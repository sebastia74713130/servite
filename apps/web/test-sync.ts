import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://obomtdrlyqhtidmbgthh.supabase.co';
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY; // Oops, this is not in .env.local

async function run() {
  const args = {
    SolicitudSincronizacion: {
      codigoAmbiente: 2,
      codigoPuntoVenta: 1, // Using PV 1
      codigoSistema: envVars.SIAT_CODIGO_SISTEMA,
      codigoSucursal: 0,
      cuis: "2017D076", // The CUIS I got previously for PV 1
      nit: parseInt(envVars.SIAT_NIT, 10),
    }
  };

  const client = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl');
  client.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  try {
    const [result] = await client.sincronizarActividadesAsync(args);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("SOAP Error:", e);
  }
}

run();
