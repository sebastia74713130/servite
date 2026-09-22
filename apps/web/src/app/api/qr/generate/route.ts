import { NextResponse } from 'next/server';

const BANECO_API_URL = process.env.BANECO_API_URL;
const BANECO_USER = process.env.BANECO_USER;
const BANECO_PASSWORD_ENC = process.env.BANECO_PASSWORD_ENC;
const BANECO_ACCOUNT_ENC = process.env.BANECO_ACCOUNT_ENC;

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
    const { amount, transactionId, description } = await request.json();

    if (!amount || !transactionId) {
      return NextResponse.json({ error: 'Faltan parámetros: amount o transactionId' }, { status: 400 });
    }

    if (!BANECO_API_URL) {
      throw new Error('Configuración de Banco Económico faltante');
    }

    // 1. Obtener Token
    const token = await getAuthToken();

    // 2. Generar fecha de vencimiento (ej: mañana)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // 3. Generar QR
    const qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/generateQR`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        transactionId: transactionId.toString(),
        accountCredit: BANECO_ACCOUNT_ENC,
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

