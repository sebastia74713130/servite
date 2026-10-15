import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveBranchId } from "@/lib/siat/branchHelper";
import { tendaiApiClient, EmitirFacturaPayload } from "@/lib/siat/tendaiApiClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, orderId, facturaParams } = body;
    const branchId = await resolveBranchId(restaurantId, body.branchId);

    if (!restaurantId || !facturaParams) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (restaurantId, facturaParams)" }, { status: 400 });
    }

    // 1. Obtener ajustes del restaurante (API key e info sucursal)
    const { data: siatSettings } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    let sucursal = siatSettings?.siat_codigo_sucursal ? String(siatSettings.siat_codigo_sucursal) : "0";
    let puntoVenta = siatSettings?.siat_codigo_punto_venta ? String(siatSettings.siat_codigo_punto_venta) : "0";

    if (branchId) {
      const { data: branchData } = await supabaseAdmin
        .from('branches')
        .select('siat_codigo_sucursal, siat_codigo_punto_venta')
        .eq('id', branchId)
        .single();

      if (branchData) {
        if (branchData.siat_codigo_sucursal !== null && branchData.siat_codigo_sucursal !== undefined) {
          sucursal = String(branchData.siat_codigo_sucursal);
        }
        if (branchData.siat_codigo_punto_venta !== null && branchData.siat_codigo_punto_venta !== undefined) {
          puntoVenta = String(branchData.siat_codigo_punto_venta);
        }
      }
    }

    const apiKey = siatSettings?.siat_api_key || process.env.FACTURACION_API_KEY;

    // 2. Normalizar datos del cliente
    const cabecera = facturaParams.cabecera || {};
    let docCliente = String(cabecera.numeroDocumento || '').trim();
    let nombreCliente = String(cabecera.nombreRazonSocial || '').trim();

    if (!docCliente || docCliente === '0') {
      docCliente = '99002';
      nombreCliente = 'CONTROL TRIBUTARIO';
    }

    let tipoDoc = cabecera.codigoTipoDocumentoIdentidad;
    if (!tipoDoc) {
      tipoDoc = /^\d{10,}$/.test(docCliente) ? 5 : 1; // 5 = NIT, 1 = CI
      if (docCliente === '99002') tipoDoc = 1;
    }

    // 3. Mapear ítems para la API Centralizada
    const items = (facturaParams.detalle || []).map((d: any, idx: number) => ({
      codigoProducto: String(d.codigoProducto || `PROD-${idx + 1}`),
      descripcion: String(d.descripcion || 'Producto / Servicio'),
      cantidad: Number(d.cantidad || 1),
      precioUnitario: Number(d.precioUnitario || 0),
      montoDescuento: Number(d.montoDescuento || 0),
      unidadMedida: Number(d.unidadMedida || 58),
      actividadEconomica: d.actividadEconomica || siatSettings?.siat_actividad_economica || undefined,
      codigoProductoSin: d.codigoProductoSin ? Number(d.codigoProductoSin) : (siatSettings?.siat_codigo_producto_sin ? Number(siatSettings.siat_codigo_producto_sin) : undefined),
    }));

    const codigoPuntoVentaFinal = cabecera.codigoPuntoVenta !== undefined 
      ? Number(cabecera.codigoPuntoVenta) 
      : (parseInt(puntoVenta, 10) || 0);

    const payload: EmitirFacturaPayload = {
      codigoSucursal: parseInt(sucursal, 10) || 0,
      codigoPuntoVenta: codigoPuntoVentaFinal,
      numeroFactura: cabecera.numeroFactura ? Number(cabecera.numeroFactura) : undefined,
      externalReference: orderId || undefined,
      metodoPago: Number(cabecera.codigoMetodoPago || 1),
      numeroTarjeta: cabecera.numeroTarjeta || undefined,
      montoGiftCard: Number(cabecera.montoGiftCard || 0),
      descuentoAdicional: Number(cabecera.descuentoAdicional || 0),
      leyenda: cabecera.leyenda || undefined,
      usuario: cabecera.usuario || 'cajero',
      cliente: {
        numeroDocumento: docCliente,
        nombreRazonSocial: nombreCliente,
        codigoTipoDocumentoIdentidad: tipoDoc,
        complemento: cabecera.complemento || undefined,
        codigoCliente: cabecera.codigoCliente || docCliente,
      },
      items,
    };

    // 4. Delegar la emisión al microservicio centralizado
    const resp = await tendaiApiClient.emitirFactura(payload, apiKey);

    if (resp.success && resp.invoice) {
      const inv = resp.invoice;
      const estado = resp.offline ? 'PENDIENTE_OFFLINE' : inv.estado;

      // 5. Persistir en la tabla local de invoices para consistencia con órdenes y reportes
      const { error: insertError } = await supabaseAdmin.from('invoices').insert({
        order_id: orderId || null,
        restaurant_id: restaurantId,
        cuf: inv.cuf,
        numero_factura: inv.numeroFactura,
        xml_signed: null,
        siat_estado: estado,
        codigo_recepcion: inv.codigoRecepcion || null,
        detalles_error: resp.offline ? 'Factura emitida en modo contingencia (Offline)' : null,
      });

      if (insertError) {
        console.error("Advertencia: No se pudo registrar localmente la factura:", insertError.message);
      }

      return NextResponse.json({
        success: true,
        offline: resp.offline || false,
        message: resp.message,
        cuf: inv.cuf,
        numeroFactura: inv.numeroFactura,
        codigoRecepcion: inv.codigoRecepcion,
        estado: estado,
        qrUrl: inv.qrUrl,
        ticketUrl: tendaiApiClient.getTicketUrl(inv.cuf),
      });
    }

    // Caso Rechazo o Error de la API
    if (resp.invoice?.cuf) {
      await supabaseAdmin.from('invoices').insert({
        order_id: orderId || null,
        restaurant_id: restaurantId,
        cuf: resp.invoice.cuf,
        numero_factura: resp.invoice.numeroFactura || 0,
        siat_estado: 'RECHAZADA',
        detalles_error: JSON.stringify(resp.detalles || resp.error),
      });
    }

    return NextResponse.json({
      success: false,
      error: resp.error || 'Factura rechazada por el SIAT',
      cuf: resp.invoice?.cuf,
      detalles: resp.detalles || resp.error,
    }, { status: 400 });

  } catch (error: any) {
    console.error("Error en /api/siat/emitir:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Error interno al procesar emisión de factura" 
    }, { status: 500 });
  }
}
