import { NextResponse } from 'next/server';
import { getAuthToken, BANECO_API_URL, getPaidQrMap } from '@/lib/baneco';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qrId = searchParams.get('qrId');

    if (!qrId) {
      return NextResponse.json({ error: 'Falta qrId' }, { status: 400 });
    }

    // 1. Revisar si ya fue notificado por webhook notifyPaymentQR
    const paidMap = getPaidQrMap();
    if (paidMap.has(qrId)) {
      const webhookPayment = paidMap.get(qrId);
      return NextResponse.json({
        success: true,
        paid: true,
        isCancelled: false,
        statusQrCode: 1,
        payment: [webhookPayment],
        source: 'webhook'
      });
    }

    const token = await getAuthToken();

    // 2. Consultar estado del QR según especificación 7.4 (Página 9): GET /api/qrsimple/v2/statusQR/{id}
    let qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/v2/statusQR/${qrId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    // Fallback a v1 si v2 responde 404 o 405
    if (!qrRes.ok && (qrRes.status === 404 || qrRes.status === 405)) {
      qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/statusQR/${qrId}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
    }

    let qrData: any = {};
    try {
      qrData = await qrRes.json();
    } catch {
      return NextResponse.json({ success: false, paid: false, error: 'Error parseando respuesta del banco' }, { status: 200 });
    }

    console.log('[Baneco QR Status Check]', { qrId, qrData });

    // Según Especificaciones Técnicas v1.3.0 Banco Económico:
    // statusQrCode / statusQRCode:
    //   0: activo pendiente de pago
    //   1: pagado
    //   9: anulado
    // payment: Objeto o Array con la información de la transacción de pago (cuando statusQrCode = 1)
    const rawStatus = qrData.statusQrCode ?? qrData.statusQRCode ?? qrData.status_qr_code;
    const statusNum = rawStatus !== undefined && rawStatus !== null ? Number(rawStatus) : null;

    const paymentArray = Array.isArray(qrData.payment)
      ? qrData.payment
      : (qrData.payment ? [qrData.payment] : []);
    const hasPayment = paymentArray.length > 0;

    let isPaid = statusNum === 1 || rawStatus === '1' || rawStatus === 1 || hasPayment;
    let isCancelled = statusNum === 9 || rawStatus === '9' || rawStatus === 9;

    // 3. Si statusQR aún indica 0 (pendiente), verificar mediante 7.6 Lista de QR pagados del día
    // GET /api/qrsimple/v2/paidQR/{fecha} (formato yyyyMMdd)
    if (!isPaid && !isCancelled) {
      try {
        const now = new Date();
        const boliviaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
        const yyyy = boliviaTime.getUTCFullYear();
        const mm = String(boliviaTime.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(boliviaTime.getUTCDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        const paidListRes = await fetch(`${BANECO_API_URL}/api/qrsimple/v2/paidQR/${dateStr}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (paidListRes.ok) {
          const paidListData = await paidListRes.json();
          if (paidListData.responseCode === 0 && Array.isArray(paidListData.paymentList)) {
            const foundPayment = paidListData.paymentList.find((p: any) => String(p.qrId) === String(qrId));
            if (foundPayment) {
              isPaid = true;
              paymentArray.push(foundPayment);
              paidMap.set(qrId, foundPayment);
              console.log('[Baneco QR verified via paidQR list]', foundPayment);
            }
          }
        }
      } catch (listErr) {
        console.error('[Baneco paidQR fallback check error]', listErr);
      }
    }

    if (qrData.responseCode !== 0 && !isPaid) {
      return NextResponse.json({
        success: false,
        paid: false,
        isCancelled,
        error: qrData.message || 'Error verificando QR',
        statusQrCode: statusNum,
        raw: qrData
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      paid: isPaid,
      isCancelled,
      statusQrCode: isPaid ? 1 : (isCancelled ? 9 : 0),
      payment: paymentArray,
      raw: qrData
    });
  } catch (error: any) {
    console.error('Error verificando QR:', error);
    return NextResponse.json({ success: false, paid: false, error: error.message }, { status: 200 });
  }
}
