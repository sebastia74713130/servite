import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildFacturaXml, FacturaParams } from "@/lib/siat/xml/invoiceBuilder";
import { extractKeysFromP12, signXml } from "@/lib/siat/crypto/signer";
import { generarCUF } from "@/lib/siat/crypto/cufGenerator";
import { emitirFacturaSIAT } from "@/lib/siat/services/emitirFactura";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, orderId, facturaParams, simulateOffline } = body;

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

    // Formatear fecha para SIAT (UTC-4) para asegurar que el XML y el CUF tengan exactamente la misma fecha
    const d = new Date(facturaParams.cabecera.fechaEmision);
    d.setUTCHours(d.getUTCHours() - 4); 
    const siatDate = d.toISOString().replace('Z', '');
    
    // 4. Generar el CUF de la factura con la fecha exacta del XML
    const cufParams = {
      nit: siatSettings.siat_nit,
      fechaEmision: siatDate,
      sucursal: siatSettings.siat_codigo_sucursal,
      modalidad: 1, // Electrónica en Línea
      tipoEmision: 1, // Online
      tipoFactura: 1, // Con derecho a crédito fiscal
      tipoDocumentoSector: facturaParams.cabecera.codigoDocumentoSector || 1,
      numeroFactura: facturaParams.cabecera.numeroFactura,
      puntoVenta: siatSettings.siat_codigo_punto_venta,
      codigoControlCufd: siatSettings.siat_codigo_control_cufd || siatSettings.siat_cufd.slice(-16) // Fallback solo si no hay control
    };
    
    // Inyectar datos faltantes a la cabecera
    facturaParams.cabecera.fechaEmision = siatDate;
    facturaParams.cabecera.nitEmisor = siatSettings.siat_nit;
    facturaParams.cabecera.razonSocialEmisor = "Tendai S.R.L.";
    facturaParams.cabecera.municipio = "La Paz";
    facturaParams.cabecera.telefono = "60000000";
    facturaParams.cabecera.codigoSucursal = parseInt(siatSettings.siat_codigo_sucursal);
    facturaParams.cabecera.direccion = "Av. Principal 123";
    facturaParams.cabecera.codigoPuntoVenta = facturaParams.cabecera.codigoPuntoVenta !== undefined ? facturaParams.cabecera.codigoPuntoVenta : parseInt(siatSettings.siat_codigo_punto_venta);
    if (!facturaParams.cabecera.numeroDocumento || facturaParams.cabecera.numeroDocumento === '0') {
      facturaParams.cabecera.numeroDocumento = '99002'; // NIT/CI genérico para S/N
    }
    
    if (facturaParams.cabecera.numeroDocumento === '99002') {
      facturaParams.cabecera.nombreRazonSocial = 'CONTROL TRIBUTARIO';
    }

    const docStr = facturaParams.cabecera.numeroDocumento || '';
    let tipoDoc = 1; // CI por defecto
    if (/^\d{10,}$/.test(docStr)) {
      tipoDoc = 5; // NIT si tiene 10 o más dígitos numéricos
    }
    if (docStr === '99002') tipoDoc = 1;

    facturaParams.cabecera.codigoTipoDocumentoIdentidad = facturaParams.cabecera.codigoTipoDocumentoIdentidad || tipoDoc; 
    facturaParams.cabecera.codigoExcepcion = tipoDoc === 5 ? 1 : 0; // 1 = Permitir emitir aunque el NIT no esté registrado en SIAT
    facturaParams.cabecera.codigoCliente = facturaParams.cabecera.numeroDocumento;
    facturaParams.cabecera.codigoMetodoPago = facturaParams.cabecera.codigoMetodoPago || 1; // Efectivo
    facturaParams.cabecera.codigoMoneda = 1; // Boliviano
    facturaParams.cabecera.tipoCambio = 1;
    facturaParams.cabecera.montoTotalMoneda = facturaParams.cabecera.montoTotal;
    facturaParams.cabecera.leyenda = "Ley N 453: Tienes derecho a recibir un trato equitativo y justo.";
    facturaParams.cabecera.usuario = "cajero";
    facturaParams.cabecera.codigoDocumentoSector = 1;

    // Inyectar datos faltantes a los detalles
    if (facturaParams.detalle && Array.isArray(facturaParams.detalle)) {
      facturaParams.detalle = facturaParams.detalle.map((d: any) => ({
        ...d,
        actividadEconomica: d.actividadEconomica || siatSettings.siat_actividad_economica || "561000",
        codigoProductoSin: d.codigoProductoSin || siatSettings.siat_codigo_producto_sin || 99100,
        unidadMedida: d.unidadMedida || 58,
      }));
    }

    // El cuf de facturaParams será sobreescrito por el generado para asegurar integridad
    const cuf = generarCUF(cufParams);
    facturaParams.cabecera.cuf = cuf;
    facturaParams.cabecera.cufd = siatSettings.siat_cufd;

    // 5. Construir y firmar el XML
    const xmlBase = buildFacturaXml(facturaParams);
    const xmlFirmado = signXml(xmlBase, keys.privateKeyPem, keys.certPem);

    let isSuccess = false;
    let isOffline = false;
    let resp: any = null;
    let xmlFinal = xmlFirmado;
    let cufFinal = cuf;

    try {
      if (simulateOffline) {
        throw new Error("Simulación de corte de internet (Inspección SIAT)");
      }
      // 6. Enviar al SIAT (WSDL)
      const respuestaSiat = await emitirFacturaSIAT(xmlFirmado, siatSettings);
      resp = respuestaSiat.RespuestaServicioFacturacion;
      isSuccess = resp && (resp.codigoEstado === 904 || resp.codigoEstado === 908);
    } catch (networkError: any) {
      // Si emitirFacturaSIAT lanza un error (falla de red, SIAT caído, timeout), caemos a Offline
      isOffline = true;
      
      // Regeneramos CUF con tipoEmision: 2 (Offline)
      cufParams.tipoEmision = 2;
      cufFinal = generarCUF(cufParams);
      facturaParams.cabecera.cuf = cufFinal;
      
      // Añadimos el código CAFC si existe para contingencia
      if (siatSettings.siat_cafc) {
        facturaParams.cabecera.cafc = siatSettings.siat_cafc;
      }
      
      // Re-firmamos el XML
      const xmlBaseOffline = buildFacturaXml(facturaParams);
      xmlFinal = signXml(xmlBaseOffline, keys.privateKeyPem, keys.certPem);
    }

    // Interpretar estado
    const estado = isOffline ? 'PENDIENTE_OFFLINE' : (isSuccess ? 'VALIDADA' : 'RECHAZADA');
    const detallesError = isOffline 
      ? 'Caída de conexión - Guardada para empaquetado offline' 
      : (!isSuccess ? JSON.stringify(resp?.mensajesList || resp) : null);

    // Guardar en base de datos la confirmación o estado offline
    await supabaseAdmin.from('invoices').insert({
      order_id: orderId,
      restaurant_id: restaurantId,
      cuf: cufFinal,
      numero_factura: facturaParams.cabecera.numeroFactura,
      xml_signed: xmlFinal,
      siat_estado: estado,
      codigo_recepcion: resp?.codigoRecepcion || null,
      detalles_error: detallesError
    });

    if (isOffline) {
      return NextResponse.json({
        success: true,
        message: "Factura emitida en modo contingencia (Offline).",
        cuf: cufFinal,
        offline: true
      });
    } else if (isSuccess) {
      return NextResponse.json({
        success: true,
        message: "Factura validada y recepcionada por el SIAT.",
        cuf: cufFinal,
        codigoRecepcion: resp.codigoRecepcion
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Factura rechazada por el SIAT",
        cuf: cufFinal,
        detalles: resp?.mensajesList || resp
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error en la emisión:", error);
    return NextResponse.json({ error: error.message || "Error interno emitiendo factura" }, { status: 500 });
  }
}
