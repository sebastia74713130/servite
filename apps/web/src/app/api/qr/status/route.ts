import { NextResponse } from 'next/server';
import { getAuthToken, BANECO_API_URL } from '@/lib/baneco';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qrId = searchParams.get('qrId');

    if (!qrId) {
      return NextResponse.json({ error: 'Falta qrId' }, { status: 400 });
    }

    const token = await getAuthToken();
    let qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/v2/statusQR/${qrId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    // Fallback if v2 endpoint is not found or unsupported
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

    const statusNum = qrData.statusQRCode !== undefined ? Number(qrData.statusQRCode) : null;
    const isPaid = statusNum === 1 || qrData.statusQRCode === '1' || qrData.statusQRCode === 1;
    const isCancelled = statusNum === 3 || statusNum === 4 || statusNum === 9 || qrData.statusQRCode === '3' || qrData.statusQRCode === '9';

    if (qrData.responseCode !== 0 && !isPaid) {
      return NextResponse.json({
        success: false,
        paid: false,
        isCancelled,
        error: qrData.message || 'Error verificando QR',
        statusQRCode: qrData.statusQRCode,
        raw: qrData
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      paid: isPaid,
      isCancelled,
      statusQRCode: statusNum !== null && !isNaN(statusNum) ? statusNum : qrData.statusQRCode,
      raw: qrData
    });
  } catch (error: any) {
    console.error('Error verificando QR:', error);
    return NextResponse.json({ success: false, paid: false, error: error.message }, { status: 200 });
  }
}

