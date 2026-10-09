import { NextResponse } from 'next/server';
import { getPaidQrMap } from '@/lib/baneco';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Banco Economico notifyPaymentQR (alias) received]:', body);

    const payment = body.payment;
    if (payment && payment.qrId) {
      const paidMap = getPaidQrMap();
      paidMap.set(String(payment.qrId), payment);
      console.log(`[Banco Economico] Pago registrado para qrId: ${payment.qrId}`);
    }

    return NextResponse.json({
      responseCode: 0,
      message: ""
    });
  } catch (error: any) {
    console.error('Error en notifyPaymentQR alias:', error);
    return NextResponse.json({
      responseCode: 1,
      message: error.message || 'Error procesando notificación'
    }, { status: 500 });
  }
}

