import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BANECO_API_URL = process.env.BANECO_API_URL;
const BANECO_USER = process.env.BANECO_USER;
const BANECO_PASSWORD_ENC = process.env.BANECO_PASSWORD_ENC;
const BANECO_AES_KEY = process.env.BANECO_AES_KEY;

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
    const { restaurantId, amount, transactionId, description } = await request.json();

    if (!amount || !transactionId || !restaurantId) {
      return NextResponse.json({ error: 'Faltan parámetros: restaurantId, amount o transactionId' }, { status: 400 });
    }

    if (!BANECO_API_URL || !BANECO_AES_KEY) {
      throw new Error('Configuración de Banco Económico faltante en el servidor');
    }

    // 1. Obtener la cuenta bancaria del restaurante
    const { data: integrations, error: dbError } = await supabaseAdmin
      .from('restaurant_payment_integrations')
      .select('account_number')
      .eq('restaurant_id', restaurantId)
      .eq('bank_name', 'Banco Económico')
      .eq('is_active', true)
      .limit(1);

    if (dbError || !integrations || integrations.length === 0) {
      return NextResponse.json({ error: 'El restaurante no tiene una cuenta bancaria configurada para recibir pagos QR.' }, { status: 400 });
    }

    const restaurantAccount = integrations[0].account_number;
    if (!restaurantAccount) {
       return NextResponse.json({ error: 'Número de cuenta inválido.' }, { status: 400 });
    }

    // 2. Encriptar el número de cuenta usando la llave AES maestra (CBC con IV prepended)
    const encryptedAccount = encryptAes(restaurantAccount, BANECO_AES_KEY);

    // 3. Obtener Token
    const token = await getAuthToken();

    // 4. Generar fecha de vencimiento (ej: mañana)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // 5. Generar QR
    const qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/generateQR`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        transactionId: transactionId.toString(),
        accountCredit: encryptedAccount,
        currency: 'BOB',
        amount: parseFloat(amount),
        description: description || 'Cobro Servido',
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
      qrImage: qrData.qrImage // Base64
    });

  } catch (error: any) {
    console.error('Error QR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
