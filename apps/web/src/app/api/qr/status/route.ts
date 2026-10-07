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

    return NextResponse.json({
      success: true,
      statusQRCode: qrData.statusQRCode
    });
  } catch (error: any) {
    console.error('Error verificando QR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
