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

async function run() {
  console.log("=== INICIANDO PRUEBAS DE VALIDACIÓN DE PAQUETES ===");
  
  const codigosClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl');
  codigosClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);
  
  const compraVentaClient = await soap.createClientAsync('https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl');
  compraVentaClient.addHttpHeader("apikey", `TokenApi ${envVars.SIAT_TOKEN_DELEGADO}`);

  for (const pv of [1, 0]) {
    console.log(`\n==============================================`);
    console.log(`=== EJECUTANDO 30 VALIDACIONES PARA PV ${pv} ===`);
    console.log(`==============================================\n`);

    let cuis = '';
    let cufd = '';

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
                break;
            }
        } catch(e) {}
        await delay(1000);
    }
    console.log(`CUIS y CUFD obtenidos.`);

    for (let i = 1; i <= 30; i++) {
        // Generate a random UUID for codigoRecepcion
        const dummyRecepcion = crypto.randomUUID();
        
        try {
            const [valResult] = await compraVentaClient.validacionRecepcionPaqueteFacturaAsync({
                SolicitudServicioValidacionRecepcionPaquete: {
                    codigoAmbiente: 2, codigoDocumentoSector: 1, codigoEmision: 2, codigoModalidad: 1, codigoPuntoVenta: pv,
                    codigoSistema: envVars.SIAT_CODIGO_SISTEMA, codigoSucursal: 0, cufd: cufd, cuis: cuis, nit: parseInt(envVars.SIAT_NIT, 10),
                    tipoFacturaDocumento: 1, codigoRecepcion: dummyRecepcion
                }
            });
            console.log(`Prueba ${i}/30 [PV ${pv}]:`, valResult.RespuestaServicioFacturacion?.codigoDescripcion || 'ERR');
        } catch (e) {
            console.log(`Prueba ${i}/30 [PV ${pv}]: SOAP FAULT`);
        }
        await delay(500); // 500ms delay to avoid rate limits
    }
  }
  console.log("\n=== PRUEBAS DE VALIDACIÓN COMPLETADAS ===");
}

run();
