import { NextResponse } from 'next/server';
import { getPaidQrMap } from '@/lib/baneco';

// Especificación 7.5: Notificación de pago de QR (Banco Económico)
// URI: /api/qrsimple/notifyPaymentQR
// Método: POST
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Banco Economico notifyPaymentQR received]:', body);

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
    console.error('Error en notifyPaymentQR:', error);
    return NextResponse.json({
      responseCode: 1,
      message: error.message || 'Error procesando notificación'
    }, { status: 500 });
  }
}

