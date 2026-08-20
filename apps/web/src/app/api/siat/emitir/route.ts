import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildFacturaXml, FacturaParams } from "@/lib/siat/xml/invoiceBuilder";
import { extractKeysFromP12, signXml } from "@/lib/siat/crypto/signer";
import { generarCUF } from "@/lib/siat/crypto/cufGenerator";
import { emitirFacturaSIAT } from "@/lib/siat/services/emitirFactura";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, orderId, facturaParams } = body;

    if (!restaurantId || !facturaParams) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // 1. Obtener la configuración del SIAT del restaurante
    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (dbError || !siatSettings) {
      return NextResponse.json({ error: "El restaurante no tiene configurado el SIAT" }, { status: 404 });
    }

    if (!siatSettings.siat_cuis || !siatSettings.siat_cufd) {
      return NextResponse.json({ error: "CUIS o CUFD faltantes. Por favor sincronice." }, { status: 400 });
    }

    // 2. Descargar el certificado .p12 desde el Storage
    const certPath = `${restaurantId}/cert.p12`;
    const { data: certBlob, error: storageError } = await supabaseAdmin.storage
      .from('siat_certificates')
      .download(certPath);

    if (storageError || !certBlob) {
      return NextResponse.json({ error: "No se encontró el certificado digital" }, { status: 404 });
    }

    const certBuffer = Buffer.from(await certBlob.arrayBuffer());

    // 3. Extraer las llaves del certificado usando la contraseña guardada
    let keys;
    try {
      keys = extractKeysFromP12(certBuffer, siatSettings.siat_cert_password);
    } catch (e) {
      return NextResponse.json({ error: "Contraseña del certificado incorrecta o archivo inválido" }, { status: 400 });
    }

    // 4. Generar el CUF de la factura
    const cufParams = {
      nit: siatSettings.siat_nit,
      fechaEmision: new Date(facturaParams.cabecera.fechaEmision),
      sucursal: siatSettings.siat_codigo_sucursal,
      modalidad: 1, // Electrónica en Línea
      tipoEmision: 1, // Online
      tipoFactura: 1, // Con derecho a crédito fiscal
      tipoDocumentoSector: facturaParams.cabecera.codigoDocumentoSector || 1,
      numeroFactura: facturaParams.cabecera.numeroFactura,
      puntoVenta: siatSettings.siat_codigo_punto_venta,
      codigoControlCufd: siatSettings.siat_cufd.slice(-16) // TODO: Módulo de control real del CUFD
    };
    
    // Formatear fecha para SIAT (UTC-4)
    const d = new Date(facturaParams.cabecera.fechaEmision);
    d.setUTCHours(d.getUTCHours() - 4); 
    const siatDate = d.toISOString().replace('Z', '');
    
    // Inyectar datos faltantes a la cabecera
    facturaParams.cabecera.fechaEmision = siatDate;
    facturaParams.cabecera.nitEmisor = siatSettings.siat_nit;
    facturaParams.cabecera.razonSocialEmisor = "Tendai S.R.L.";
    facturaParams.cabecera.municipio = "La Paz";
    facturaParams.cabecera.telefono = "60000000";
    facturaParams.cabecera.codigoSucursal = parseInt(siatSettings.siat_codigo_sucursal);
    facturaParams.cabecera.direccion = "Av. Principal 123";
    facturaParams.cabecera.codigoPuntoVenta = parseInt(siatSettings.siat_codigo_punto_venta);
    facturaParams.cabecera.codigoTipoDocumentoIdentidad = 1; // 1 = CI, 5 = NIT
    facturaParams.cabecera.codigoCliente = facturaParams.cabecera.numeroDocumento;
    facturaParams.cabecera.codigoMetodoPago = 1; // Efectivo
    facturaParams.cabecera.codigoMoneda = 1; // Boliviano
    facturaParams.cabecera.tipoCambio = 1;
    facturaParams.cabecera.montoTotalMoneda = facturaParams.cabecera.montoTotal;
    facturaParams.cabecera.leyenda = "Ley N 453: Tienes derecho a recibir un trato equitativo y justo.";
    facturaParams.cabecera.usuario = "cajero";
    facturaParams.cabecera.codigoDocumentoSector = 1;

    // El cuf de facturaParams será sobreescrito por el generado para asegurar integridad
    const cuf = generarCUF(cufParams);
    facturaParams.cabecera.cuf = cuf;
    facturaParams.cabecera.cufd = siatSettings.siat_cufd;

    // 5. Construir y firmar el XML
    const xmlBase = buildFacturaXml(facturaParams);
    const xmlFirmado = signXml(xmlBase, keys.privateKeyPem, keys.certPem);

    // 6. Enviar al SIAT (WSDL)
    const respuestaSiat = await emitirFacturaSIAT(xmlFirmado, siatSettings);

    // Guardar en base de datos la confirmación
    /*
    await supabaseAdmin.from('invoices').insert({
      order_id: orderId,
      restaurant_id: restaurantId,
      cuf: cuf,
      xml_signed: xmlFirmado,
      siat_reception_code: respuestaSiat.RespuestaServicioFacturacion?.codigoRecepcion || null
    });
    */

    // Interpretar respuesta del SIAT
    const resp = respuestaSiat.RespuestaServicioFacturacion;
    if (resp && (resp.codigoEstado === 904 || resp.codigoEstado === 908)) {
      // 904 = Validada Exitosamente, 908 = Observada (pero recibida)
      return NextResponse.json({
        success: true,
        message: "Factura validada y recepcionada por el SIAT.",
        cuf: cuf,
        codigoRecepcion: resp.codigoRecepcion
      });
    } else {
      // Rechazada u otro error
      return NextResponse.json({
        success: false,
        error: "Factura rechazada por el SIAT",
        cuf: cuf,
        detalles: resp?.mensajesList || resp
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error en la emisión:", error);
    return NextResponse.json({ error: error.message || "Error interno emitiendo factura" }, { status: 500 });
  }
}
