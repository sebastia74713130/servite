export interface FacturaDetalle {
  actividadEconomica: string;
  codigoProductoSin: number;
  codigoProducto: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: number; // Ej. 58 para Unidad
  precioUnitario: number;
  montoDescuento: number;
  subTotal: number;
  numeroSerie?: string;
  numeroImei?: string;
}

export interface FacturaCabecera {
  nitEmisor: string;
  razonSocialEmisor: string;
  municipio: string;
  telefono: string;
  numeroFactura: number;
  cuf: string;
  cufd: string;
  codigoSucursal: number;
  direccion: string;
  codigoPuntoVenta?: number;
  fechaEmision: string; // Formato YYYY-MM-DDThh:mm:ss.SSS
  nombreRazonSocial: string; // Cliente
  codigoTipoDocumentoIdentidad: number; // Ej. 1 (CI), 5 (NIT)
  numeroDocumento: string; // Documento del cliente
  complemento?: string;
  codigoCliente: string;
  codigoMetodoPago: number; // Ej. 1 (Efectivo)
  numeroTarjeta?: number;
  montoTotal: number;
  montoTotalSujetoIva: number;
  codigoMoneda: number; // Ej. 1 (Boliviano)
  tipoCambio: number; // Ej. 1
  montoTotalMoneda: number;
  montoGiftCard?: number;
  descuentoAdicional?: number;
  codigoExcepcion?: number;
  cafc?: string;
  leyenda: string;
  usuario: string;
  codigoDocumentoSector: number; // 1 para Compra Venta
}

export interface FacturaParams {
  cabecera: FacturaCabecera;
  detalle: FacturaDetalle[];
}

/**
 * Genera el XML base (sin firmar) para una Factura Electrónica Compra Venta Estandar (Sector 1).
 */
export function buildFacturaXml(params: FacturaParams): string {
  const { cabecera, detalle } = params;

  // Construir los nodos de detalle
  const detallesXml = detalle.map(d => `
      <detalle>
        <actividadEconomica>${d.actividadEconomica}</actividadEconomica>
        <codigoProductoSin>${d.codigoProductoSin}</codigoProductoSin>
        <codigoProducto>${d.codigoProducto}</codigoProducto>
        <descripcion>${d.descripcion}</descripcion>
        <cantidad>${d.cantidad}</cantidad>
        <unidadMedida>${d.unidadMedida}</unidadMedida>
        <precioUnitario>${d.precioUnitario}</precioUnitario>
        <montoDescuento>${d.montoDescuento}</montoDescuento>
        <subTotal>${d.subTotal}</subTotal>
        ${d.numeroSerie ? `<numeroSerie>${d.numeroSerie}</numeroSerie>` : `<numeroSerie xsi:nil="true"/>`}
        ${d.numeroImei ? `<numeroImei>${d.numeroImei}</numeroImei>` : `<numeroImei xsi:nil="true"/>`}
      </detalle>`).join("");

  // Construir el XML completo (El root puede variar si es Computarizada o Electrónica, asumimos Electrónica)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<facturaElectronicaCompraVenta xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="facturaElectronicaCompraVenta.xsd">
  <cabecera>
    <nitEmisor>${cabecera.nitEmisor}</nitEmisor>
    <razonSocialEmisor>${cabecera.razonSocialEmisor}</razonSocialEmisor>
    <municipio>${cabecera.municipio}</municipio>
    <telefono>${cabecera.telefono}</telefono>
    <numeroFactura>${cabecera.numeroFactura}</numeroFactura>
    <cuf>${cabecera.cuf}</cuf>
    <cufd>${cabecera.cufd}</cufd>
    <codigoSucursal>${cabecera.codigoSucursal}</codigoSucursal>
    <direccion>${cabecera.direccion}</direccion>
    ${cabecera.codigoPuntoVenta !== undefined ? `<codigoPuntoVenta>${cabecera.codigoPuntoVenta}</codigoPuntoVenta>` : `<codigoPuntoVenta xsi:nil="true"/>`}
    <fechaEmision>${cabecera.fechaEmision}</fechaEmision>
    <nombreRazonSocial>${cabecera.nombreRazonSocial}</nombreRazonSocial>
    <codigoTipoDocumentoIdentidad>${cabecera.codigoTipoDocumentoIdentidad}</codigoTipoDocumentoIdentidad>
    <numeroDocumento>${cabecera.numeroDocumento}</numeroDocumento>
    ${cabecera.complemento ? `<complemento>${cabecera.complemento}</complemento>` : `<complemento xsi:nil="true"/>`}
    <codigoCliente>${cabecera.codigoCliente}</codigoCliente>
    <codigoMetodoPago>${cabecera.codigoMetodoPago}</codigoMetodoPago>
    ${cabecera.numeroTarjeta ? `<numeroTarjeta>${cabecera.numeroTarjeta}</numeroTarjeta>` : `<numeroTarjeta xsi:nil="true"/>`}
    <montoTotal>${cabecera.montoTotal}</montoTotal>
    <montoTotalSujetoIva>${cabecera.montoTotalSujetoIva}</montoTotalSujetoIva>
    <codigoMoneda>${cabecera.codigoMoneda}</codigoMoneda>
    <tipoCambio>${cabecera.tipoCambio}</tipoCambio>
    <montoTotalMoneda>${cabecera.montoTotalMoneda}</montoTotalMoneda>
    ${cabecera.montoGiftCard !== undefined ? `<montoGiftCard>${cabecera.montoGiftCard}</montoGiftCard>` : `<montoGiftCard xsi:nil="true"/>`}
    <descuentoAdicional>${cabecera.descuentoAdicional || 0}</descuentoAdicional>
    ${cabecera.codigoExcepcion !== undefined ? `<codigoExcepcion>${cabecera.codigoExcepcion}</codigoExcepcion>` : `<codigoExcepcion xsi:nil="true"/>`}
    ${cabecera.cafc ? `<cafc>${cabecera.cafc}</cafc>` : `<cafc xsi:nil="true"/>`}
    <leyenda>${cabecera.leyenda}</leyenda>
    <usuario>${cabecera.usuario}</usuario>
    <codigoDocumentoSector>${cabecera.codigoDocumentoSector}</codigoDocumentoSector>
  </cabecera>
  ${detallesXml}
</facturaElectronicaCompraVenta>`;

  return xml;
}
