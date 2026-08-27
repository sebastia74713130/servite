export class SipService {
  private static token: string | null = null;
  private static tokenExpiresAt: number = 0;

  private static get baseUrl() {
    return process.env.SIP_API_URL || 'https://dev-sip.mc4.com.bo:8443';
  }

  /**
   * Obtiene un token JWT de SIP (Válido por 4 horas).
   * Usa una caché en memoria básica.
   */
  private static async getToken(): Promise<string> {
    const now = Date.now();
    // Refresh token si expira en menos de 5 minutos
    if (this.token && this.tokenExpiresAt > now + 5 * 60 * 1000) {
      return this.token;
    }

    const response = await fetch(`${this.baseUrl}/autenticacion/v1/generarToken`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SIP_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: process.env.SIP_USERNAME,
        password: process.env.SIP_PASSWORD
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('SIP Token Error:', text);
      throw new Error(`Error autenticando con SIP: ${response.status}`);
    }

    const data = await response.json();
    if (data.codigo !== 'OK') {
      throw new Error(`SIP devolvió error: ${data.mensaje}`);
    }

    this.token = data.objeto.token;
    // Guardar tiempo de expiración (4 horas = 14400000 ms). 
    // Restamos 10 minutos por seguridad.
    this.tokenExpiresAt = now + (4 * 60 * 60 * 1000) - (10 * 60 * 1000);

    return this.token!;
  }

  /**
   * Genera un QR dinámico para una orden específica
   */
  public static async generarQr(params: {
    alias: string;
    monto: number;
    glosa: string;
    fechaVencimiento: string; // formato dd/mm/yyyy
  }) {
    const token = await this.getToken();

    const payload = {
      alias: params.alias, // Usaremos el ID de la orden en Supabase
      callback: process.env.SIP_CALLBACK_URL, // Ej: https://tudominio.com/api/sip/callback
      detalleGlosa: params.glosa.substring(0, 30), // La doc dice máx 30 caracteres
      monto: params.monto, // validación > 0, separador decimal "."
      moneda: 'BOB',
      fechaVencimiento: params.fechaVencimiento,
      tipoSolicitud: 'API',
      unicoUso: 'true'
    };

    const response = await fetch(`${this.baseUrl}/api/v1/generaQr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikeyServicio': process.env.SIP_API_KEY_SERVICIO || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('SIP Generar QR Error:', text);
      throw new Error(`Error generando QR: ${response.status}`);
    }

    const data = await response.json();
    if (data.codigo !== '0000') {
      throw new Error(`Error SIP al generar QR: ${data.mensaje}`);
    }

    return {
      imagenQrBase64: data.objeto.imagenQr,
      idQr: data.objeto.idQr,
      fechaVencimiento: data.objeto.fechaVencimiento
    };
  }
}
