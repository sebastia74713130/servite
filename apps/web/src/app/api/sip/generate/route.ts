import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SipService } from '@/lib/sip';

export async function POST(req: Request) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    // Obtener las órdenes agrupadas bajo este intento de pago
    const { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, total, is_paid')
      .eq('payment_intent_id', paymentIntentId);

    if (orderError || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Orders not found' }, { status: 404 });
    }

    if (orders[0].is_paid) {
      return NextResponse.json({ error: 'Orders are already paid' }, { status: 400 });
    }

    const totalAmount = orders.reduce((acc, o) => acc + Number(o.total), 0);

    const date = new Date();
    date.setDate(date.getDate() + 1);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const fechaVencimiento = `${day}/${month}/${year}`;

    // Alias debe ser máximo 50 caracteres.
    const qrData = await SipService.generarQr({
      alias: paymentIntentId,
      monto: totalAmount,
      glosa: `Pago Servido - ${paymentIntentId.substring(0, 8)}`,
      fechaVencimiento
    });

    return NextResponse.json({
      success: true,
      qrBase64: qrData.imagenQrBase64,
      idQr: qrData.idQr
    });

  } catch (error: any) {
    console.error('API /sip/generate Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
