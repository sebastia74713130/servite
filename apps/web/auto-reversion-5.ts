import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
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
  console.log("=== INICIANDO ETAPA XI: REVERSIÓN ===");
  
  const p12Path = path.resolve(process.cwd(), envVars.SIAT_CERT_PATH);
  const p12Buffer = fs.readFileSync(p12Path);
  const { privateKeyPem, certPem } = extractKeysFromP12(p12Buffer, envVars.SIAT_CERT_PASSWORD);

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const compraVentaClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  compraVentaClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  let numFacturaGlobal = 90000;

  for (const pv of [0]) {
    console.log(`\n==============================================`);
    console.log(`=== INICIANDO 5 PRUEBAS PARA PV ${pv} ===`);
    console.log(`==============================================\n`);

    for (let i = 1; i <= 5; i++) {
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

      numFacturaGlobal++;
      const fechaXML = getBoliviaTimeForXML();
      const cuf = generarCUF({
          nit: envVars.SIAT_NIT, fechaEmision: fechaXML, sucursal: 0, modalidad: 1, tipoEmision: 1,
          tipoFactura: 1, tipoDocumentoSector: 1, numeroFactura: numFacturaGlobal, puntoVenta: pv, codigoControlCufd: cufdControl
      });

      const xmlStr = buildFacturaXml({
          cabecera: {
              nitEmisor: envVars.SIAT_NIT, razonSocialEmisor: "Tendai S.R.L.", municipio: "La Paz", telefono: "77777777",
              numeroFactura: numFacturaGlobal, cuf, cufd, codigoSucursal: 0, direccion: "Av Central", codigoPuntoVenta: pv,
              fechaEmision: fechaXML, nombreRazonSocial: "SN", codigoTipoDocumentoIdentidad: 1, numeroDocumento: "1234567",
              codigoCliente: "1234567", codigoMetodoPago: 1, montoTotal: 100, montoTotalSujetoIva: 100, codigoMoneda: 1,
              tipoCambio: 1, montoTotalMoneda: 100, descuentoAdicional: 0, leyenda: "Ley N 453: Tienes derecho a recibir un trato equitativo y justo.", usuario: "test", codigoDocumentoSector: 1
          },
          detalle: [{ actividadEconomica: "6201000", codigoProductoSin: 1003913, codigoProducto: "P001", descripcion: "Producto Test", cantidad: 1, unidadMedida: 58, precioUnitario: 100, montoDescuento: 0, subTotal: 100 }]
      });

      const signedXml = signXml(xmlStr, privateKeyPem, certPem);
      const gzipBuffer = zlib.gzipSync(Buffer.from(signedXml, 'utf8'));
      const archivoBase64 = gzipBuffer.toString('base64');
      const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");

      process.stdout.write(`PV ${pv} | Prueba ${i}/5 -> `);

      // 1. EMITIR
      try {
          const [emitResult] = await compraVentaClient.recepcionFacturaAsync({
              SolicitudServicioRecepcionFactura: {
                  codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 1, codigoModalidad: 1, codigoPuntoVenta: pv,
                  codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                  tipoFacturaDocumento: 1, archivo: archivoBase64, fechaEnvio: getBoliviaTimeForXML(), hashArchivo: hashArchivo
              }
          });
          if (emitResult.RespuestaServicioFacturacion?.codigoEstado !== 908) {
              process.stdout.write(`[ERROR EMISION] ${JSON.stringify(emitResult.RespuestaServicioFacturacion?.mensajesList)} \n`);
              continue;
          }
      } catch(e) { process.stdout.write(`[SOAP ERR] \n`); continue; }
      
      process.stdout.write(`[EMITIDA] `);
      await delay(3000);

      // 2. ANULAR
      try {
          const [anulResult] = await compraVentaClient.anulacionFacturaAsync({
              SolicitudServicioAnulacionFactura: {
                  codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 1, codigoModalidad: 1, codigoPuntoVenta: pv,
                  codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                  tipoFacturaDocumento: 1, codigoMotivo: 1, cuf: cuf
              }
          });
          if (!anulResult.RespuestaServicioFacturacion?.transaccion) {
              process.stdout.write(`[ERROR ANULACION] ${JSON.stringify(anulResult.RespuestaServicioFacturacion?.mensajesList)} \n`);
              continue;
          }
      } catch(e) { process.stdout.write(`[SOAP ERR ANUL] \n`); continue; }

      process.stdout.write(`[ANULADA] `);
      await delay(3000);

      // 3. REVERTIR
      try {
          const [revResult] = await compraVentaClient.reversionAnulacionFacturaAsync({
              SolicitudServicioReversionAnulacionFactura: {
                  codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 1, codigoModalidad: 1, codigoPuntoVenta: pv,
                  codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                  tipoFacturaDocumento: 1, cuf: cuf
              }
          });
          if (revResult.RespuestaServicioFacturacion?.transaccion) {
              process.stdout.write(`[REVERTIDA OK]\n`);
          } else {
              process.stdout.write(`[ERROR REVERSION] ${JSON.stringify(revResult.RespuestaServicioFacturacion?.mensajesList)}\n`);
          }
      } catch(e) { process.stdout.write(`[SOAP ERR REVERSION]\n`); }
      
      await delay(1000);
    }
  }
  console.log("\n=== ETAPA XI COMPLETADA ===");
}

run();
