import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

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

function getBoliviaTimeForXML(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', '');
}

function buildConfirmacionCompra(nro: number, nit: string, cuf: string, numFac: number, tipoCompra: number) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<confirmacionCompra>
    <nro>${nro}</nro>
    <nitEmisor>${nit}</nitEmisor>
    <codigoAutorizacion>${cuf}</codigoAutorizacion>
    <numeroFactura>${numFac}</numeroFactura>
    <tipoCompra>${tipoCompra}</tipoCompra>
</confirmacionCompra>`;
}

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
  console.log("=== INICIANDO ETAPA XII: RECEPCIÓN DE COMPRAS (40 PRUEBAS) ===");

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const comprasClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioRecepcionCompras?wsdl');
  comprasClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Get a CUIS and CUFD just to have them
  let cuis = '';
  let cufd = '';
  while(true) {
      try {
          const [cuisResult] = await codigosClient.cuisAsync({ SolicitudCuis: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10) }});
          cuis = cuisResult.RespuestaCuis?.codigo;
          if (cuis) break;
      } catch(e) {}
      await delay(1000);
  }
  
  while(true) {
      try {
          const [cufdResult] = await codigosClient.cufdAsync({ SolicitudCufd: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: 0, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10) }});
          if (cufdResult.RespuestaCufd?.transaccion) {
              cufd = cufdResult.RespuestaCufd.codigo;
              break;
          }
      } catch(e) {}
      await delay(1000);
  }

  const configs = [
      { tipoCompra: 2, cantidadFacturas: 10, desc: "No gravadas (= 10)" },
      { tipoCompra: 2, cantidadFacturas: 5,  desc: "No gravadas (< 10)" },
      { tipoCompra: 1, cantidadFacturas: 5,  desc: "Gravadas (< 10)" },
      { tipoCompra: 1, cantidadFacturas: 10, desc: "Gravadas (= 10)" }
  ];

  let numFacturaGlobal = 10000;

  for (const config of configs) {
      console.log(`\n==============================================`);
      console.log(`=== TIPO: ${config.tipoCompra} | ${config.desc} ===`);
      console.log(`==============================================`);

      let successful = 0;
      let iterations = 0;

      while (successful < 10) {
          iterations++;
          const tempDir = path.join(process.cwd(), 'scratch', `compras_${config.tipoCompra}_${config.cantidadFacturas}_iter_${iterations}`);
          if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
          }

          for (let f = 1; f <= config.cantidadFacturas; f++) {
              numFacturaGlobal++;
              // According to F0_Confirmacion
              const fakeSupplierNit = "154422029"; 
              const fakeCuf = "1";
              const xml = buildConfirmacionCompra(f, fakeSupplierNit, fakeCuf, numFacturaGlobal, config.tipoCompra);
              fs.writeFileSync(path.join(tempDir, `compra_${f}.xml`), xml);
          }

          const tarName = `compras_t${config.tipoCompra}_c${config.cantidadFacturas}_iter${iterations}.tar.gz`;
          const tarPath = path.join(process.cwd(), 'scratch', tarName);
          execSync(`cd ${tempDir} && tar -czf ${tarPath} *`);

          const gzipBuffer = fs.readFileSync(tarPath);
          const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex").toUpperCase();
          const archivoBase64 = gzipBuffer.toString("base64");

          try {
              const [recepResult] = await comprasClient.confirmacionComprasAsync({
                  SolicitudConfirmacionCompras: {
                      codigoAmbiente: 2,
                      codigoPuntoVenta: 0,
                      codigoSucursal: 0,
                      codigoSistema: envVars.SIAT_CODIGO_SISTEMA, 
                      cufd: cufd, 
                      cuis: cuis, 
                      nit: parseInt(envVars.SIAT_NIT, 10), 
                      archivo: archivoBase64,
                      cantidadFacturas: config.cantidadFacturas, 
                      fechaEnvio: getBoliviaTimeForXML(), 
                      gestion: currentYear,
                      hashArchivo: hashArchivo, 
                      periodo: currentMonth
                  }
              });
              
              if (recepResult.RespuestaServicioFacturacion?.transaccion) {
                  successful++;
                  const codigoRecepcion = recepResult.RespuestaServicioFacturacion.codigoRecepcion;
                  process.stdout.write(`Prueba ${successful}/10 -> [ENVIADO PAQUETE ${codigoRecepcion}]\n`);
              } else {
                  const msgs = recepResult.RespuestaServicioFacturacion?.mensajesList;
                  // If it's code -1, don't crash, just retry or report
                  if (Array.isArray(msgs) && msgs.length > 0 && msgs[0].codigo === -1) {
                      process.stdout.write(`Prueba ${successful+1}/10 -> [ERROR API] ${JSON.stringify(msgs)}\n`);
                      // wait a bit and retry
                      await delay(2000);
                  } else {
                      process.stdout.write(`Prueba ${successful+1}/10 -> [ERROR API] ${JSON.stringify(msgs)}\n`);
                  }
              }
          } catch(e) {
              process.stdout.write(`Prueba ${successful+1}/10 -> [SOAP ERR]\n`);
          }
          
          await delay(2000);
      }
  }

  console.log("\n=== ETAPA XII COMPLETADA ===");
}

run().catch(console.error);
