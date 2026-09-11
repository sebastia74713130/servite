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
  console.log("=== INICIANDO PRUEBAS ENERGIA (MOTIVO 7) ===");
  console.log("Test 13: 10 pruebas x PV 1 | = 500 facturas c/u");
  console.log("Test 14: 10 pruebas x PV 0 | < 500 facturas c/u");
  
  const p12Path = path.resolve(process.cwd(), envVars.SIAT_CERT_PATH);
  const p12Buffer = fs.readFileSync(p12Path);
  const { privateKeyPem, certPem } = extractKeysFromP12(p12Buffer, envVars.SIAT_CERT_PASSWORD);

  const codigosClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const opsClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl');
  opsClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const compraVentaClient = await createClientWithRetry('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  compraVentaClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  const evento = { motivo: 7, desc: 'CORTE DE SUMINISTRO DE ENERGIA ELÉCTRICA', iteraciones: 10 };
  
  const configurations = [
      { pv: 1, cantidadFacturas: 500 }, // Test 13
      { pv: 0, cantidadFacturas: 5 }    // Test 14 (< 500)
  ];

  for (const config of configurations) {
    const pv = config.pv;
    const cantidadFacturas = config.cantidadFacturas;
    let numFacturaGlobal = 0; // Reset por cada PV para usar CAFC desde el inicio

    console.log(`\n==============================================`);
    console.log(`=== INICIANDO PRUEBAS PARA PV ${pv} (Cant: ${cantidadFacturas}) ===`);
    console.log(`==============================================\n`);

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
    console.log(`   CUFD Obtenido.`);

    console.log(`\n--- PROBANDO MOTIVO ${evento.motivo}: ${evento.desc} (${evento.iteraciones} PAQUETES) ---`);
    
    let codigoEvento = '';
    await delay(2000);
    let eventStart = getBoliviaTime(-1000);
    let eventEnd = getBoliviaTime(0);
    
    while(true) {
        try {
          const [eventResult] = await opsClient.registroEventoSignificativoAsync({
              SolicitudEventoSignificativo: { codigoAmbiente: 2, codigoMotivoEvento: evento.motivo, codigoPuntoVenta: pv, codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cufdEvento: cufd, cuis: cuis, descripcion: evento.desc, fechaHoraFinEvento: eventEnd, fechaHoraInicioEvento: eventStart, nit: parseInt(envVars.SIAT_NIT, 10) }
          });
          if (eventResult.RespuestaListaEventos?.transaccion) {
              codigoEvento = eventResult.RespuestaListaEventos.codigoRecepcionEventoSignificativo;
              break;
          }
        } catch(e) {}
        await delay(1000);
    }
    console.log(`   Evento Registrado OK: ${codigoEvento}`);

    for (let p = 1; p <= evento.iteraciones; p++) {
      const tempDir = path.join(process.cwd(), 'scratch', `temp_ene_pv${pv}_p${p}`);
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
                  tipoCambio: 1, montoTotalMoneda: 100, descuentoAdicional: 0, leyenda: "Ley N 453: Tienes derecho a recibir un trato equitativo y justo.", usuario: "test", codigoDocumentoSector: 1,
                  cafc: "101C155D9178E" // CAFC obligatorio para emisión fuera de línea = 2
              },
              detalle: [{ actividadEconomica: "6201000", codigoProductoSin: 1003913, codigoProducto: "P001", descripcion: "Producto Test", cantidad: 1, unidadMedida: 58, precioUnitario: 100, montoDescuento: 0, subTotal: 100 }]
          });

          const signedXml = signXml(xmlStr, privateKeyPem, certPem);
          fs.writeFileSync(path.join(tempDir, `factura_${f}.xml`), signedXml);
      }

      const tarName = `paquete_ene_pv${pv}_p${p}.tar.gz`;
      const tarPath = path.join(process.cwd(), 'scratch', tarName);
      execSync(`cd ${tempDir} && tar -czf ${tarPath} *`);

      const gzipBuffer = fs.readFileSync(tarPath);
      const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");
      const archivoBase64 = gzipBuffer.toString("base64");

      let codigoRecepcionPaquete = '';
      while(true) {
          try {
              const [recepResult] = await compraVentaClient.recepcionPaqueteFacturaAsync({
                  SolicitudServicioRecepcionPaquete: {
                      codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
                      codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                      tipoFacturaDocumento: 1, archivo: archivoBase64, fechaEnvio: getBoliviaTimeForXML(), hashArchivo: hashArchivo,
                      cafc: "101C155D9178E", cantidadFacturas: cantidadFacturas, codigoEvento: codigoEvento
                  }
              });
              if (recepResult.RespuestaServicioFacturacion?.transaccion) {
                  codigoRecepcionPaquete = recepResult.RespuestaServicioFacturacion.codigoRecepcion;
                  break;
              } else {
                  console.log(`\nError enviando P${p}:`, recepResult.RespuestaServicioFacturacion);
                  break; 
              }
          } catch(e) {}
          await delay(2000);
      }

      if (!codigoRecepcionPaquete) continue;
      process.stdout.write(`[P${p}] `);

      let iter = 0;
      let validado = false;
      while(iter < 20) { 
          await delay(3000);
          iter++;
          try {
              const [valResult] = await compraVentaClient.validacionRecepcionPaqueteFacturaAsync({
                  SolicitudServicioValidacionRecepcionPaquete: {
                      codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
                      codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                      tipoFacturaDocumento: 1, codigoRecepcion: codigoRecepcionPaquete
                  }
              });
              const codDesc = valResult.RespuestaServicioFacturacion?.codigoDescripcion;
              if (codDesc === 'VALIDADA') {
                  process.stdout.write(`OK\n`);
                  validado = true;
                  break;
              } else if (codDesc === 'RECHAZADA') {
                  process.stdout.write(`RECHAZADA\n`);
                  console.log(JSON.stringify(valResult.RespuestaServicioFacturacion.mensajesList));
                  break;
              }
          } catch(e) {}
      }
      if (!validado && iter >= 20) process.stdout.write(`TIMEOUT\n`);
    }
  }
  
  console.log("\n=== PRUEBAS ENERGIA COMPLETADAS ===");
}

run();
