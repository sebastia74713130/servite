import { NextResponse } from 'next/server';
import { getAuthToken, BANECO_API_URL } from '@/lib/baneco';

export async function POST(request: Request) {
  try {
    const { qrId } = await request.json();

    if (!qrId) {
      return NextResponse.json({ error: 'Falta qrId' }, { status: 400 });
    }

    const token = await getAuthToken();
    const qrRes = await fetch(`${BANECO_API_URL}/api/qrsimple/cancelQR`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ qrId })
    });

    const qrData = await qrRes.json();
    if (qrData.responseCode !== 0) {
      return NextResponse.json({ error: qrData.message || 'Error cancelando QR' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelando QR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
