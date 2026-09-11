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
    if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
        cleanVal = cleanVal.slice(1, -1);
    }
    envVars[key.trim()] = cleanVal;
  }
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function getBoliviaTimeForXML(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return boliviaTime.toISOString().replace('Z', ''); // YYYY-MM-DDTHH:mm:ss.SSS
}

async function createClientWithRetry(url: string, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await soap.createClientAsync(url);
    } catch (e) {
      console.log(`Error al conectar con WSDL ${url}. Reintentando...`);
      await delay(2000);
    }
  }
  throw new Error(`Fallo fatal al conectar con WSDL ${url}`);
}

async function run() {
  console.log("=== INICIANDO ETAPA VII: ANULACIÓN DE FACTURAS ===");
  
  // 1. Cargar Llaves
  const p12Path = path.resolve(process.cwd(), envVars.SIAT_CERT_PATH);
  const p12Buffer = fs.readFileSync(p12Path);
  const { privateKeyPem, certPem } = extractKeysFromP12(p12Buffer, envVars.SIAT_CERT_PASSWORD);

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const compraVentaClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  compraVentaClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  let numFacturaGlobal = 60000; // Para no chocar con las offline
  const REQUIRED = 125;

  for (const pv of [1, 0]) { // PV 1 primero, luego PV 0
    console.log(`\n==============================================`);
    console.log(`=== INICIANDO ANULACIONES PARA PV ${pv} ===`);
    console.log(`==============================================\n`);

    let cuis = '';
    let cufd = '';
    let cufdControl = '';

    // Obtener CUIS
    while(true) {
        try {
            const [cuisResult] = await codigosClient.cuisAsync({ SolicitudCuis: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, nit: parseInt(envVars.SIAT_NIT, 10) }});
            cuis = cuisResult.RespuestaCuis?.codigo;
            if (cuis) break;
        } catch(e) {}
        await delay(1000);
    }
    
    // Obtener CUFD
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
    console.log(`CUIS y CUFD obtenidos con éxito para PV ${pv}. Iniciando ${REQUIRED} ciclos...\n`);

    let exitos = 0;

    for (let i = 1; i <= REQUIRED; i++) {
        process.stdout.write(`Prueba ${i}/${REQUIRED}: `);
        numFacturaGlobal++;
        
        try {
            // --- FASE 1: EMISIÓN DE FACTURA ---
            const fechaXML = getBoliviaTimeForXML();
            const cuf = generarCUF({
                nit: envVars.SIAT_NIT, fechaEmision: fechaXML, sucursal: 0, modalidad: 1, tipoEmision: 1, // 1 = Online
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
            
            // Comprimir XML individual en GZIP
            const xmlBuffer = Buffer.from(signedXml, "utf-8");
            const gzipBuffer = zlib.gzipSync(xmlBuffer);
            const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");
            const archivoBase64 = gzipBuffer.toString("base64");

            // Enviar Factura Online
            const [recepResult] = await compraVentaClient.recepcionFacturaAsync({
                SolicitudServicioRecepcionFactura: {
                    codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 1, codigoModalidad: 1, codigoPuntoVenta: pv,
                    codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                    tipoFacturaDocumento: 1, archivo: archivoBase64, fechaEnvio: getBoliviaTimeForXML(), hashArchivo: hashArchivo
                }
            });

            if (!recepResult.RespuestaServicioFacturacion?.transaccion) {
                // If it fails (e.g. invalid cufd, network), we wait and retry later
                process.stdout.write(` [EMISIÓN FAIL] \n`);
                console.log(JSON.stringify(recepResult.RespuestaServicioFacturacion?.mensajesList));
                await delay(2000);
                // Re-get CUFD just in case
                const [cufdResult] = await codigosClient.cufdAsync({ SolicitudCufd: { codigoAmbiente: 2, codigoModalidad: 1, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10) }});
                if (cufdResult.RespuestaCufd?.transaccion) { cufd = cufdResult.RespuestaCufd.codigo; cufdControl = cufdResult.RespuestaCufd.codigoControl; }
                continue;
            }

            process.stdout.write(`[EMITIDA OK] -> `);

            // --- FASE 2: ANULACIÓN DE FACTURA ---
            await delay(1000); // Pequeña pausa de cortesía para el SIAT
            
            const [anulResult] = await compraVentaClient.anulacionFacturaAsync({
                SolicitudServicioAnulacionFactura: {
                    codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 1, codigoModalidad: 1, codigoPuntoVenta: pv,
                    codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                    tipoFacturaDocumento: 1, codigoMotivo: 1, cuf: cuf
                }
            });

            if (anulResult.RespuestaServicioFacturacion?.transaccion) {
                process.stdout.write(`[ANULADA OK]\n`);
                exitos++;
            } else {
                process.stdout.write(`[ANULACIÓN FAIL]\n`);
                console.log(JSON.stringify(anulResult.RespuestaServicioFacturacion?.mensajesList));
            }

        } catch (e) {
            process.stdout.write(`[ERROR RED/SOAP]\n`);
        }

        await delay(1500); // Esperar 1.5s entre ciclos
    }
    
    console.log(`\nResultados PV ${pv}: ${exitos}/${REQUIRED} anulaciones exitosas.\n`);
  }

  console.log("\n=== ETAPA VII COMPLETADA ===");
}

run();
