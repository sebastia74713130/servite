import { buildFacturaXml, FacturaParams } from "./src/lib/siat/xml/invoiceBuilder";
import { signXml, extractKeysFromP12 } from "./src/lib/siat/crypto/signer";
import { siatConfig } from "./src/lib/siat/config";
import { generarCUF } from "./src/lib/siat/crypto/cufGenerator";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  try {
    // 1. Generar CUF
    const nit = "698777025";
    const cufParams = {
      nit: nit,
      fechaEmision: new Date(),
      sucursal: 0,
      modalidad: 1, 
      tipoEmision: 1, 
      tipoFactura: 1, 
      tipoDocumentoSector: 1, 
      numeroFactura: 1,
      puntoVenta: 0,
      codigoControlCufd: "4BDAEFD0AA1BF74" // Usamos el código de control del CUFD de prueba
    };
    const cufGenerado = generarCUF(cufParams);

    // 2. Construir la Factura XML
    const facturaData: FacturaParams = {
      cabecera: {
        nitEmisor: nit,
        razonSocialEmisor: "Restaurante de Prueba SRL",
        municipio: "La Paz",
        telefono: "77241702",
        numeroFactura: 1,
        cuf: cufGenerado,
        cufd: "FBQXlDKinCv0FBI3MkMzQjY1N0RGQnxaSGdOUUlhVUMjI4NDlGRjk0Rk", // Ejemplo
        codigoSucursal: 0,
        direccion: "ZONA: BAJO LLOJETA, CALLE: LOS NARDOS, NRO.: 35",
        codigoPuntoVenta: 0,
        fechaEmision: cufParams.fechaEmision.toISOString(),
        nombreRazonSocial: "Juan Perez",
        codigoTipoDocumentoIdentidad: 1, // CI
        numeroDocumento: "1234567",
        codigoCliente: "1234567",
        codigoMetodoPago: 1, // Efectivo
        montoTotal: 50.00,
        montoTotalSujetoIva: 50.00,
        codigoMoneda: 1, // Bs
        tipoCambio: 1,
        montoTotalMoneda: 50.00,
        leyenda: "Leyenda de prueba del SIAT",
        usuario: "admin",
        codigoDocumentoSector: 1
      },
      detalle: [
        {
          actividadEconomica: "6209920", // Usando la que bajamos en el Hito 4
          codigoProductoSin: 83141, // Servicio de desarrollo
          codigoProducto: "PROD-001",
          descripcion: "Hamburguesa Clasica",
          cantidad: 1,
          unidadMedida: 58, // Unidad
          precioUnitario: 50.00,
          montoDescuento: 0,
          subTotal: 50.00
        }
      ]
    };

    const xmlBase = buildFacturaXml(facturaData);
    console.log("=== XML BASE CREADO ===");
    console.log(xmlBase.substring(0, 300) + "...\n");

    // 3. Firmar el XML
    const keys = extractKeysFromP12("certs/softoken.p12", "Aleida25007566");
    const xmlFirmado = signXml(xmlBase, keys.privateKeyPem, keys.certPem);
    
    console.log("✅ Factura Compra Venta Construida y Firmada Exitosamente.");
    console.log("Longitud del XML final:", xmlFirmado.length, "bytes.");
    
  } catch (error) {
    console.error("Error construyendo factura:", error);
  }
}

main();
