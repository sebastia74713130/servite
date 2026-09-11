import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
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

function getBoliviaTime(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', '') + '-04:00';
}
function getBoliviaTimeForXML(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', '');
}

async function run() {
  const p12Path = path.resolve(process.cwd(), envVars.SIAT_CERT_PATH);
  const p12Buffer = fs.readFileSync(p12Path);
  const { privateKeyPem, certPem } = extractKeysFromP12(p12Buffer, envVars.SIAT_CERT_PASSWORD);

  const codigosClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const opsClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl');
  opsClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const compraVentaClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  compraVentaClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const pv = 1;
  const event = { motivo: 1, desc: 'CORTE DEL SERVICIO DE INTERNET' };
  const cantidadFacturas = 500;
  let numFacturaGlobal = 400000;

  let cuis = '';
  while (true) {
      const [cuisResult] = await codigosClient.cuisAsync({ SolicitudCuis: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10) }});
      cuis = cuisResult.RespuestaCuis?.codigo;
      if (cuis) break;
      await delay(2000);
  }

  let cufd = '';
  let cufdControl = '';
  while (true) {
      const [cufdResult] = await codigosClient.cufdAsync({ SolicitudCufd: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10) }});
      if (cufdResult.RespuestaCufd?.transaccion) {
          cufd = cufdResult.RespuestaCufd.codigo;
          cufdControl = cufdResult.RespuestaCufd.codigoControl;
          break;
      }
      await delay(2000);
  }

  let codigoEvento = '';
  while (true) {
      const [eventResult] = await opsClient.registroEventoSignificativoAsync({
          SolicitudEventoSignificativo: { codigoAmbiente: 2, codigoMotivoEvento: event.motivo, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cufdEvento: cufd, cuis: cuis, descripcion: event.desc, fechaHoraFinEvento: getBoliviaTime(0), fechaHoraInicioEvento: getBoliviaTime(-1000), nit: parseInt(envVars.SIAT_NIT, 10) }
      });
      if (eventResult.RespuestaListaEventos?.transaccion) {
          codigoEvento = eventResult.RespuestaListaEventos.codigoRecepcionEventoSignificativo;
          break;
      }
      await delay(2000);
  }
  
  console.log("CODIGO EVENTO OBTENIDO:", codigoEvento);

  const tempDir = path.join(process.cwd(), 'scratch', `temp_test_pv${pv}`);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  for (let f = 0; f < cantidadFacturas; f++) {
      numFacturaGlobal++;
      const fechaXML = getBoliviaTimeForXML();
      const cuf = generarCUF({
          nit: envVars.SIAT_NIT, fechaEmision: fechaXML, sucursal: 0, modalidad: 1, tipoEmision: 2,
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
      fs.writeFileSync(path.join(tempDir, `factura_${f}.xml`), signXml(xmlStr, privateKeyPem, certPem));
  }

  const tarPath = path.join(process.cwd(), 'scratch', 'test_paquete.tar.gz');
  execSync(`cd ${tempDir} && tar -czf ${tarPath} *`);
  const gzipBuffer = fs.readFileSync(tarPath);
  const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");
  const archivoBase64 = gzipBuffer.toString("base64");

  const [recepResult] = await compraVentaClient.recepcionPaqueteFacturaAsync({
      SolicitudServicioRecepcionPaquete: {
          codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
          codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
          tipoFacturaDocumento: 1, archivo: archivoBase64, fechaEnvio: getBoliviaTimeForXML(), hashArchivo: hashArchivo,
          cafc: "", cantidadFacturas: cantidadFacturas, codigoEvento: codigoEvento
      }
  });
  console.log("LAST REQUEST:", compraVentaClient.lastRequest);
  console.log("RECEPCION:", JSON.stringify(recepResult, null, 2));
}

run();
