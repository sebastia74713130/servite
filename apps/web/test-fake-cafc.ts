import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
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

function getBoliviaTimeForXML(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', ''); // YYYY-MM-DDTHH:mm:ss.SSS
}

async function run() {
  const p12Buffer = fs.readFileSync(path.resolve(process.cwd(), envVars.SIAT_CERT_PATH));
  const { privateKeyPem, certPem } = extractKeysFromP12(p12Buffer, envVars.SIAT_CERT_PASSWORD);

  const codigosClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const compraVentaClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  compraVentaClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const pv = 0;
  
  // 1. Get CUIS and CUFD
  let cuis = '';
  while(!cuis) {
      const [cuisResult] = await codigosClient.cuisAsync({ SolicitudCuis: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10) }});
      cuis = cuisResult.RespuestaCuis?.codigo;
      await new Promise(r=>setTimeout(r, 1000));
  }
  
  let cufd = '';
  let cufdControl = '';
  while(!cufd) {
      const [cufdResult] = await codigosClient.cufdAsync({ SolicitudCufd: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis, nit: parseInt(envVars.SIAT_NIT, 10) }});
      cufd = cufdResult.RespuestaCufd?.codigo;
      cufdControl = cufdResult.RespuestaCufd?.codigoControl;
      await new Promise(r=>setTimeout(r, 1000));
  }

  // 2. Generate Evento
  const opsClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl');
  opsClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  let codigoEvento = '';
  while(!codigoEvento) {
      const dStart = new Date(); dStart.setUTCHours(dStart.getUTCHours() - 4); dStart.setSeconds(dStart.getSeconds() - 5);
      const dEnd = new Date(); dEnd.setUTCHours(dEnd.getUTCHours() - 4);
      const fechaStart = dStart.toISOString().replace('Z', '') + '-04:00';
      const fechaEnd = dEnd.toISOString().replace('Z', '') + '-04:00';

      try {
          const [eventResult] = await opsClient.registroEventoSignificativoAsync({
              SolicitudEventoSignificativo: { codigoAmbiente: 2, codigoMotivoEvento: 5, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd, cufdEvento: cufd, cuis, descripcion: 'VIRUS', fechaHoraFinEvento: fechaEnd, fechaHoraInicioEvento: fechaStart, nit: parseInt(envVars.SIAT_NIT, 10) }
          });
          codigoEvento = eventResult.RespuestaListaEventos?.codigoRecepcionEventoSignificativo;
      } catch(e) {}
      if (!codigoEvento) await new Promise(r=>setTimeout(r, 1000));
  }
  console.log("Evento:", codigoEvento);

  // 3. Build XML with fake CAFC
  const tempDir = path.join(process.cwd(), 'scratch', 'temp_cafc');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const fechaXML = getBoliviaTimeForXML();
  const cuf = generarCUF({ nit: envVars.SIAT_NIT, fechaEmision: fechaXML, sucursal: 0, modalidad: 1, tipoEmision: 2, tipoFactura: 1, tipoDocumentoSector: 1, numeroFactura: 99999, puntoVenta: pv, codigoControlCufd: cufdControl });
  
  const xmlStr = buildFacturaXml({
      cabecera: {
          nitEmisor: envVars.SIAT_NIT, razonSocialEmisor: "Tendai S.R.L.", municipio: "La Paz", telefono: "77777777",
          numeroFactura: 99999, cuf, cufd, codigoSucursal: 0, direccion: "Av Central", codigoPuntoVenta: pv,
          fechaEmision: fechaXML, nombreRazonSocial: "SN", codigoTipoDocumentoIdentidad: 1, numeroDocumento: "1234567",
          codigoCliente: "1234567", codigoMetodoPago: 1, montoTotal: 100, montoTotalSujetoIva: 100, codigoMoneda: 1,
          tipoCambio: 1, montoTotalMoneda: 100, descuentoAdicional: 0, leyenda: "Ley N 453.", usuario: "test", codigoDocumentoSector: 1,
          cafc: "1011A2B3C4D5E6F" // FAKE CAFC
      },
      detalle: [{ actividadEconomica: "6201000", codigoProductoSin: 1003913, codigoProducto: "P001", descripcion: "Producto", cantidad: 1, unidadMedida: 58, precioUnitario: 100, montoDescuento: 0, subTotal: 100 }]
  });

  fs.writeFileSync(path.join(tempDir, 'factura_0.xml'), signXml(xmlStr, privateKeyPem, certPem));
  
  const tarPath = path.join(process.cwd(), 'scratch', 'test_cafc.tar.gz');
  execSync(`cd ${tempDir} && tar -czf ${tarPath} *`);

  const gzipBuffer = fs.readFileSync(tarPath);
  const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");
  const archivoBase64 = gzipBuffer.toString("base64");

  const [recepResult] = await compraVentaClient.recepcionPaqueteFacturaAsync({
      SolicitudServicioRecepcionPaquete: {
          codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd, cuis, nit: parseInt(envVars.SIAT_NIT, 10),
          tipoFacturaDocumento: 1, archivo: archivoBase64, fechaEnvio: getBoliviaTimeForXML(), hashArchivo,
          cantidadFacturas: 1, codigoEvento
      }
  });
  console.log(JSON.stringify(recepResult, null, 2));
}

run();
