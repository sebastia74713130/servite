import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use same logic as status QR but inside this route directly or import getAuthToken
const BANECO_API_URL = process.env.BANECO_API_URL;
const BANECO_USER = process.env.BANECO_USER;
const BANECO_PASSWORD_ENC = process.env.BANECO_PASSWORD_ENC;

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
    const { qrId, restaurantId, plan, isTest } = await request.json();

    if (!restaurantId || !plan) {
      return NextResponse.json({ error: 'Faltan parámetros: restaurantId o plan' }, { status: 400 });
    }

    if (isTest && plan === 'TEST') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 días de prueba

      const { error: dbError } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_plan: 'TEST',
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString()
        })
        .eq('id', restaurantId);

      if (dbError) throw new Error('Error activando el plan de prueba');

      return NextResponse.json({ success: true, paid: true, statusQRCode: 1 });
    }

    if (!qrId) {
      return NextResponse.json({ error: 'Falta qrId' }, { status: 400 });
    }

    const token = await getAuthToken();
    const qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/v2/statusQR/${qrId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    const qrData = await qrRes.json();
    if (qrData.responseCode !== 0) {
      return NextResponse.json({ error: qrData.message || 'Error verificando QR' }, { status: 400 });
    }

    const statusQRCode = qrData.statusQRCode;

    // 1 = Pagado, 2 = Generado/Pendiente, 3 = Vencido/Anulado
    if (statusQRCode === 1) {
      // Calcular fecha de expiración: 30 días a partir de ahora
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: dbError } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_plan: plan,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString()
        })
        .eq('id', restaurantId);

      if (dbError) {
        throw new Error('Error actualizando la suscripción en la base de datos');
      }

      return NextResponse.json({
        success: true,
        paid: true,
        statusQRCode
      });
    }

    return NextResponse.json({
      success: true,
      paid: false,
      statusQRCode
    });
  } catch (error: any) {
    console.error('Error verificando pago de suscripción:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

