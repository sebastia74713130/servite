/**
 * Cliente HTTP tipado para el Microservicio Centralizado de Facturación SIAT
 * Facturas by Tendai: https://facturas-by-tendai-nhnm.vercel.app
 */

export interface EmitirFacturaItemApi {
  codigoProducto?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  montoDescuento?: number;
  unidadMedida?: number; // 58 = Unidad por defecto
  actividadEconomica?: string;
  codigoProductoSin?: number;
  numeroSerie?: string;
  numeroImei?: string;
}

export interface EmitirFacturaClienteApi {
  numeroDocumento: string;
  nombreRazonSocial: string;
  codigoTipoDocumentoIdentidad?: number; // 1 = CI, 5 = NIT
  complemento?: string;
  codigoCliente?: string;
}

export interface EmitirFacturaPayload {
  codigoSucursal?: number;
  codigoPuntoVenta?: number;
  numeroFactura?: number;
  externalReference?: string;
  metodoPago?: number; // 1 = Efectivo, 2 = Tarjeta, etc.
  numeroTarjeta?: string;
  montoGiftCard?: number;
  descuentoAdicional?: number;
  leyenda?: string;
  usuario?: string;
  cliente: EmitirFacturaClienteApi;
  items: EmitirFacturaItemApi[];
}

export interface EmitirFacturaResponse {
  success: boolean;
  offline?: boolean;
  message: string;
  invoice?: {
    id: string;
    numeroFactura: number;
    cuf: string;
    codigoRecepcion?: string;
    estado: 'VALIDADA' | 'PENDIENTE_OFFLINE' | 'RECHAZADA';
    montoTotal: number;
    qrUrl: string;
  };
  detalles?: any;
  error?: string;
}

export interface ConsultarFacturaResponse {
  success: boolean;
  invoice?: {
    id: string;
    cuf: string;
    numeroFactura: number;
    fechaEmision: string;
    montoTotal: number;
    montoSujetoIva: number;
    cliente: {
      nombre: string;
      documento: string;
      tipoDocumento: number;
    };
    estado: string;
    codigoRecepcion?: string;
    detallesError?: any;
    externalReference?: string;
    qrUrl: string;
  };
  error?: string;
}

export interface SyncCuisResponse {
  success: boolean;
  message: string;
  data?: {
    posId: string;
    codigoSucursal: number;
    codigoPuntoVenta: number;
    cuis: string;
    fechaVigencia: string;
  };
  error?: string;
  detalles?: any;
}

export interface SyncCufdResponse {
  success: boolean;
  message: string;
  data?: {
    posId: string;
    codigoSucursal: number;
    codigoPuntoVenta: number;
    cufd: string;
    codigoControl: string;
    fechaVigencia: string;
  };
  error?: string;
  detalles?: any;
}

export interface PosData {
  id: string;
  tenant_id: string;
  codigo_sucursal: number;
  codigo_punto_venta: number;
  nombre: string;
  cuis: string | null;
  cuis_fecha_vigencia: string | null;
  cufd: string | null;
  cufd_codigo_control: string | null;
  cufd_fecha_vigencia: string | null;
  is_active: boolean;
}

export class TendaiApiClient {
  private _baseUrl?: string;
  private _apiKey?: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this._baseUrl = baseUrl;
    this._apiKey = apiKey;
  }

  get baseUrl(): string {
    return (this._baseUrl || process.env.FACTURACION_API_URL || 'https://facturas-by-tendai-nhnm.vercel.app').replace(/\/$/, '');
  }

  get defaultApiKey(): string {
    return this._apiKey || process.env.FACTURACION_API_KEY || 'siat_tendai_servite_live_11fec28dc36ce2703a35eb8c';
  }

  private getHeaders(customApiKey?: string): Record<string, string> {
    const key = customApiKey || this.defaultApiKey;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (key) {
      headers['X-API-Key'] = key;
    }
    return headers;
  }

  /**
   * 1. Emitir Factura Electrónica (Compra-Venta Sector 1)
   */
  async emitirFactura(payload: EmitirFacturaPayload, apiKey?: string): Promise<EmitirFacturaResponse> {
    const url = `${this.baseUrl}/api/v1/invoices`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
    if (!res.ok && !data.error) {
      data.error = `Error HTTP ${res.status}: ${res.statusText}`;
    }
    return data;
  }

  /**
   * 2. Consultar Factura por CUF
   */
  async consultarFactura(cuf: string, apiKey?: string): Promise<ConsultarFacturaResponse> {
    const url = `${this.baseUrl}/api/v1/invoices/${encodeURIComponent(cuf)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
    });

    return res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
  }

  /**
   * 3. Anular Factura ante el SIAT
   */
  async anularFactura(cuf: string, codigoMotivo: number = 1, apiKey?: string): Promise<{ success: boolean; message?: string; error?: string; detalles?: any; cuf?: string }> {
    const url = `${this.baseUrl}/api/v1/invoices/${encodeURIComponent(cuf)}/cancel`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify({ codigoMotivo }),
    });

    return res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
  }

  /**
   * 4. Revertir Anulación ante el SIAT
   */
  async revertirAnulacion(cuf: string, apiKey?: string): Promise<{ success: boolean; message?: string; error?: string; detalles?: any; cuf?: string }> {
    const url = `${this.baseUrl}/api/v1/invoices/${encodeURIComponent(cuf)}/revert-cancel`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify({}),
    });

    return res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
  }

  /**
   * 5. Sincronizar / Solicitar CUIS
   */
  async sincronizarCuis(sucursal = 0, puntoVenta = 0, apiKey?: string): Promise<SyncCuisResponse> {
    const url = `${this.baseUrl}/api/v1/pos/sync-cuis`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify({
        codigoSucursal: sucursal,
        codigoPuntoVenta: puntoVenta,
      }),
    });

    return res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
  }

  /**
   * 6. Sincronizar / Solicitar CUFD
   */
  async sincronizarCufd(sucursal = 0, puntoVenta = 0, apiKey?: string, force = true): Promise<SyncCufdResponse> {
    const url = `${this.baseUrl}/api/v1/pos/sync-cufd`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify({
        codigoSucursal: sucursal,
        codigoPuntoVenta: puntoVenta,
        force,
      }),
    });

    return res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
  }

  /**
   * 7. Obtener lista de Puntos de Venta
   */
  async getPuntosVenta(apiKey?: string): Promise<{ success: boolean; data?: PosData[]; error?: string }> {
    const url = `${this.baseUrl}/api/v1/pos`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
    });

    return res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
  }

  /**
   * 8. Sincronizar Catálogos Oficiales del SIN
   */
  async sincronizarCatalogos(sucursal = 0, puntoVenta = 0, apiKey?: string): Promise<{ success: boolean; message?: string; data?: any; error?: string }> {
    const url = `${this.baseUrl}/api/v1/catalogs/sync?sucursal=${sucursal}&puntoVenta=${puntoVenta}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
    });

    return res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
  }

  /**
   * 9. Probar Comunicación con el SIAT (Ping)
   */
  async pingSiat(apiKey?: string): Promise<{ success: boolean; message: string; ambiente?: string; data?: any; error?: string }> {
    const url = `${this.baseUrl}/health/ping-siat`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
    });

    return res.json().catch(() => ({ success: false, message: 'Fallo al contactar el microservicio', error: 'Respuesta inválida' }));
  }

  /**
   * 10. URL de Ticket Térmico con QR Oficial
   */
  getTicketUrl(cuf: string): string {
    return `${this.baseUrl}/api/v1/invoices/${encodeURIComponent(cuf)}/ticket`;
  }

  /**
   * 11. URL de Descarga de XML Firmado
   */
  getXmlUrl(cuf: string): string {
    return `${this.baseUrl}/api/v1/invoices/${encodeURIComponent(cuf)}/xml`;
  }
}

// Instancia singleton por defecto
export const tendaiApiClient = new TendaiApiClient();

