import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BANECO_API_URL = process.env.BANECO_API_URL;
const BANECO_USER = process.env.BANECO_USER;
const BANECO_PASSWORD_ENC = process.env.BANECO_PASSWORD_ENC;
const BANECO_AES_KEY = process.env.BANECO_AES_KEY;

// Fixed account for subscription payments
const SUBSCRIPTION_ACCOUNT = '2111681618';

function encryptAes(text: string, keyString: string) {
  const key = Buffer.from(keyString, 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  
  return Buffer.concat([iv, encrypted]).toString('base64');
}

async function getAuthToken() {
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

export async function POST(request: Request) {
  try {
    const { restaurantId, plan, amount } = await request.json();

    if (!restaurantId || !plan || !amount) {
      return NextResponse.json({ error: 'Faltan parámetros: restaurantId, plan o amount' }, { status: 400 });
    }

    if (!BANECO_API_URL || !BANECO_AES_KEY) {
      throw new Error('Configuración de Banco Económico faltante en el servidor');
    }

    const transactionId = `sub_${restaurantId}_${Date.now()}`;

    // 1. Encriptar el número de cuenta fijo de servite
    const encryptedAccount = encryptAes(SUBSCRIPTION_ACCOUNT, BANECO_AES_KEY);

    // 2. Obtener Token
    const token = await getAuthToken();

    // 3. Generar fecha de vencimiento (mañana, aunque el QR expira a los 10 mins desde el cliente)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // 4. Generar QR
    const qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/generateQR`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        transactionId,
        accountCredit: encryptedAccount,
        currency: 'BOB',
        amount: parseFloat(amount),
        description: `Suscripcion Plan ${plan} - Servido`,
        dueDate: dueDateStr,
        singleUse: true,
        modifyAmount: false
      })
    });

    const qrData = await qrRes.json();
    
    if (qrData.responseCode !== 0) {
      throw new Error(qrData.message || 'Error generando QR');
    }

    return NextResponse.json({
      success: true,
      qrId: qrData.qrId,
      transactionId,
      qrImage: qrData.qrImage // Base64
    });

  } catch (error: any) {
    console.error('Error QR de suscripción:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

