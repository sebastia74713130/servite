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

function getBoliviaTime(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', '') + '-04:00';
}

async function run() {
  console.log("=== INICIANDO EVENTOS: RECUPERACIÓN MOTIVO 7 Y 5 (PV1) ===");
  
  const codigosClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const opsClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl');
  opsClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const REQUIRED = 5;

  const events = [
    { pv: 1, motivo: 7, desc: 'CAMBIO DE INFRAESTRUCTURA DE SISTEMA O FALLA DE HARDWARE' },
    { pv: 1, motivo: 5, desc: 'CORTE DE SUMINISTRO DE ENERGIA ELÉCTRICA' }
  ];

  for (const event of events) {
      console.log(`\n--- Probando Evento ${event.motivo}: ${event.desc} para PV ${event.pv} ---`);
      
      // 1. Obtener CUIS
      let cuis = '';
      while (true) {
          const [cuisResult] = await codigosClient.cuisAsync({
            SolicitudCuis: {
              codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: event.pv,
              codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10),
            }
          });
          cuis = cuisResult.RespuestaCuis?.codigo;
          if (cuis) break;
          await delay(2000);
      }
      
      // 2. Obtener CUFD
      let cufd = '';
      while (true) {
          const [cufdResult] = await codigosClient.cufdAsync({
              SolicitudCufd: {
                codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: event.pv,
                codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
              }
          });
          cufd = cufdResult.RespuestaCufd?.codigo;
          if (cufd) break;
          await delay(2000);
      }

      let exitos = 0;
      for (let i = 0; i < REQUIRED; i++) {
        await delay(2000);
        try {
          const startDate = getBoliviaTime(-1000);
          const endDate = getBoliviaTime(0);

          const args = {
              SolicitudEventoSignificativo: {
                  codigoAmbiente: 2, codigoMotivoEvento: event.motivo, codigoPuntoVenta: event.pv,
                  codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0,
                  cufd: cufd, cufdEvento: cufd, cuis: cuis,
                  descripcion: event.desc, fechaHoraFinEvento: endDate, fechaHoraInicioEvento: startDate,
                  nit: parseInt(envVars.SIAT_NIT, 10),
              }
          };

          const [eventResult] = await opsClient.registroEventoSignificativoAsync(args);
          if (eventResult.RespuestaListaEventos?.transaccion) {
            process.stdout.write(` [OK] `); 
            exitos++;
          } else {
            process.stdout.write(' [FAIL] ');
          }
        } catch (e) {
          process.stdout.write(' [ERR] '); 
        }
      }
      console.log(`\nResultados: ${exitos}/${REQUIRED} peticiones exitosas para PV ${event.pv}.`);
  }
  console.log("\n=== FINALIZADO ===");
}

run();
