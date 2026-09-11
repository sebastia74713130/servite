import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { extractKeysFromP12, signXml } from './src/lib/siat/crypto/signer';
import { buildFacturaXml } from './src/lib/siat/xml/invoiceBuilder';
import { generarCUF } from './src/lib/siat/crypto/cufGenerator';

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
<confirmacionCompra xsi:noNamespaceSchemaLocation="confirmacionCompra.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
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
  console.log("=== INICIANDO ETAPA XII: RECEPCIÓN DE COMPRAS ===");

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const comprasClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioRecepcionCompras?wsdl');
  comprasClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const pv = 0; // "no aplica" => 0

  let cuis = '';
  let cufd = '';
  let cufdControl = '';

  while(true) {
      try {
          const [cuisResult] = await codigosClient.cuisAsync({ SolicitudCuis: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10) }});
          cuis = cuisResult.RespuestaCuis?.codigo;
          if (cuis) break;
      } catch(e) {}
      await delay(1000);
  }
  
  while(true) {
      try {
          const [cufdResult] = await codigosClient.cufdAsync({ SolicitudCufd: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10) }});
          if (cufdResult.RespuestaCufd?.transaccion) {
              cufd = cufdResult.RespuestaCufd.codigo;
              cufdControl = cufdResult.RespuestaCufd.codigoControl;
              break;
          }
      } catch(e) {}
      await delay(1000);
  }

  let numFacturaGlobal = 1000;
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();

  for (let tipoCompra = 1; tipoCompra <= 5; tipoCompra++) {
      console.log(`\n==============================================`);
      console.log(`=== PROCESANDO TIPO DE COMPRA: ${tipoCompra} ===`);
      console.log(`==============================================\n`);

      const tests = [5, 10]; // < 10 and == 10

      for (const cantidadFacturas of tests) {
          process.stdout.write(`Prueba con ${cantidadFacturas} facturas -> `);
          
          const tempDir = path.join(process.cwd(), 'scratch', `compras_t${tipoCompra}_c${cantidadFacturas}`);
          if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
          fs.mkdirSync(tempDir, { recursive: true });

          for (let f = 1; f <= cantidadFacturas; f++) {
              numFacturaGlobal++;
              
              const fakeSupplierNit = "154422029"; 
              const fakeCuf = "1";
              // Usar numFactura fijo o global
              const xml = buildConfirmacionCompra(f, fakeSupplierNit, fakeCuf, 11110 + numFacturaGlobal, tipoCompra);
              
              fs.writeFileSync(path.join(tempDir, `compra_${f}.xml`), xml);
          }

          const tarName = `compras_t${tipoCompra}_c${cantidadFacturas}.tar.gz`;
          const tarPath = path.join(process.cwd(), 'scratch', tarName);
          execSync(`cd ${tempDir} && tar -czf ${tarPath} *`);

          const gzipBuffer = fs.readFileSync(tarPath);
          const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex").toUpperCase();
          const archivoBase64 = gzipBuffer.toString("base64");

          let codigoRecepcion = '';
          while(true) {
              try {
                  const [recepResult] = await comprasClient.confirmacionComprasAsync({
                      SolicitudConfirmacionCompras: {
                          codigoAmbiente: 2, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0,
                          cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10), archivo: archivoBase64,
                          cantidadFacturas: cantidadFacturas, fechaEnvio: getBoliviaTimeForXML(), gestion: currentYear,
                          hashArchivo: hashArchivo, periodo: currentMonth
                      }
                  });
                  if (recepResult.RespuestaServicioFacturacion?.transaccion) {
                      codigoRecepcion = recepResult.RespuestaServicioFacturacion.codigoRecepcion;
                      process.stdout.write(`[ENVIADO PAQUETE ${codigoRecepcion}]\n`);
                      break;
                  } else {
                      process.stdout.write(`[ERROR API] ${JSON.stringify(recepResult.RespuestaServicioFacturacion?.mensajesList)}\n`);
                      break;
                  }
              } catch(e) {
                  process.stdout.write(`[SOAP ERR]\n`);
                  await delay(2000);
              }
          }
          await delay(2000);
      }
  }
  console.log("\n=== ETAPA XII COMPLETADA ===");
}

run();
