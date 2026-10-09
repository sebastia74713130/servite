export const BANECO_API_URL = process.env.BANECO_API_URL;
const BANECO_USER = process.env.BANECO_USER;
const BANECO_PASSWORD_ENC = process.env.BANECO_PASSWORD_ENC;
export const BANECO_AES_KEY = process.env.BANECO_AES_KEY;

export async function getAuthToken() {
  if (!BANECO_API_URL) throw new Error('BANECO_API_URL no configurado');
  const res = await fetch(`${BANECO_API_URL}/api/authentication/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: BANECO_USER,
      password: BANECO_PASSWORD_ENC
    })
  });
  const data = await res.json();
  if (data.responseCode !== 0) {
    throw new Error(data.message || 'Error autenticando con Banco Económico');
  }
  return data.token;
}

// Registro en memoria de pagos recibidos por webhook (notifyPaymentQR)
declare global {
  var __banecoPaidQrs: Map<string, any> | undefined;
}

export function getPaidQrMap(): Map<string, any> {
  if (!globalThis.__banecoPaidQrs) {
    globalThis.__banecoPaidQrs = new Map();
  }
  return globalThis.__banecoPaidQrs;
}

