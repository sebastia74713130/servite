import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
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
  console.log("=== INICIANDO TEST EMIT & CONFIRM ===");
  
  const p12Path = path.resolve(process.cwd(), envVars.SIAT_CERT_PATH);
  const p12Buffer = fs.readFileSync(p12Path);
  const { privateKeyPem, certPem } = extractKeysFromP12(p12Buffer, envVars.SIAT_CERT_PASSWORD);

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const compraVentaClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  compraVentaClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const comprasClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioRecepcionCompras?wsdl');
  comprasClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  let pv = 0;
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

  const numFacturaGlobal = Math.floor(Math.random() * 1000000);
  const fechaXML = getBoliviaTimeForXML();
  const cuf = generarCUF({
      nit: envVars.SIAT_NIT, fechaEmision: fechaXML, sucursal: 0, modalidad: 1, tipoEmision: 1,
      tipoFactura: 1, tipoDocumentoSector: 1, numeroFactura: numFacturaGlobal, puntoVenta: pv, codigoControlCufd: cufdControl
  });

  const xmlStr = buildFacturaXml({
      cabecera: {
          nitEmisor: envVars.SIAT_NIT, razonSocialEmisor: "Tendai S.R.L.", municipio: "La Paz", telefono: "77777777",
          numeroFactura: numFacturaGlobal, cuf, cufd, codigoSucursal: 0, direccion: "Av Central", codigoPuntoVenta: pv,
          fechaEmision: fechaXML, nombreRazonSocial: "SN", codigoTipoDocumentoIdentidad: 1, numeroDocumento: envVars.SIAT_NIT,
          codigoCliente: envVars.SIAT_NIT, codigoMetodoPago: 1, montoTotal: 100, montoTotalSujetoIva: 100, codigoMoneda: 1,
          tipoCambio: 1, montoTotalMoneda: 100, descuentoAdicional: 0, leyenda: "Ley N 453.", usuario: "test", codigoDocumentoSector: 1
      },
      detalle: [{ actividadEconomica: "6201000", codigoProductoSin: 1003913, codigoProducto: "P001", descripcion: "Producto Test", cantidad: 1, unidadMedida: 58, precioUnitario: 100, montoDescuento: 0, subTotal: 100 }]
  });

  const signedXml = signXml(xmlStr, privateKeyPem, certPem);
  const emitGzipBuffer = zlib.gzipSync(Buffer.from(signedXml, 'utf8'));
  const emitArchivoBase64 = emitGzipBuffer.toString('base64');
  const emitHashArchivo = crypto.createHash("sha256").update(emitGzipBuffer).digest("hex");

  console.log("1. Emitiendo factura...");
  const [emitResult] = await compraVentaClient.recepcionFacturaAsync({
      SolicitudServicioRecepcionFactura: {
          codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 1, codigoModalidad: 1, codigoPuntoVenta: pv,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
          tipoFacturaDocumento: 1, archivo: emitArchivoBase64, fechaEnvio: getBoliviaTimeForXML(), hashArchivo: emitHashArchivo
      }
  });

  if (emitResult.RespuestaServicioFacturacion?.codigoEstado !== 908) {
      console.log(`[ERROR EMISION]`, emitResult.RespuestaServicioFacturacion);
      return;
  }
  console.log("Factura emitida correctamente. CUF:", cuf);
  
  await delay(5000); // Wait for DB to settle

  console.log("2. Confirmando compra...");
  
  const tempDir = path.join(process.cwd(), 'scratch', 'test_confirm');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const confirmXml = buildConfirmacionCompra(1, envVars.SIAT_NIT, cuf, numFacturaGlobal, 1);
  
  const tarPath = path.join(process.cwd(), 'scratch', 'test_confirm.tar.gz');
  execSync(`cd ${tempDir} && tar -czf ${tarPath} *`);
  
  const confirmGzipBuffer = fs.readFileSync(tarPath);
  const confirmHashArchivo = crypto.createHash("sha256").update(confirmGzipBuffer).digest("hex").toUpperCase();
  const confirmArchivoBase64 = confirmGzipBuffer.toString("base64");
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [recepResult] = await comprasClient.confirmacionComprasAsync({
      SolicitudConfirmacionCompras: {
          codigoAmbiente: 2, 
          codigoSucursal: 0,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, 
          cufd: cufd, 
          cuis: cuis, 
          nit: parseInt(envVars.SIAT_NIT, 10), 
          archivo: confirmArchivoBase64,
          cantidadFacturas: 1, 
          fechaEnvio: getBoliviaTimeForXML(), 
          gestion: currentYear,
          hashArchivo: confirmHashArchivo, 
          periodo: currentMonth
      }
  });
  
  console.log(JSON.stringify(recepResult.RespuestaServicioFacturacion, null, 2));
}

run().catch(console.error);
