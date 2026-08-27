import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    // Verificación Basic Auth según especificación de SIP (Punto 3.1.1)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (
      username !== process.env.SIP_BASIC_AUTH_USERNAME ||
      password !== process.env.SIP_BASIC_AUTH_PASSWORD
    ) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Body del request
    const body = await req.json();
    console.log('SIP Webhook payload received:', body);

    /* 
      Body esperado según doc:
      {
        "alias": "id_de_la_orden",
        "estadoActual": "PAGADO",
        "monto": 20.00,
        ...
      }
    */
    const alias = body.alias; // Usamos el alias para buscar el order.id
    const estado = body.estadoActual;

    if (!alias) {
      return NextResponse.json({ codigo: "9999", mensaje: "Alias no encontrado" }, { status: 400 });
    }

    if (estado === 'PAGADO') {
      // Marcar ordenes asociadas al intent como pagadas
      const { error } = await supabaseAdmin
        .from('orders')
        .update({
          is_paid: true,
          payment_method: 'QR Dinámico',
          paid_at: new Date().toISOString()
        })
        .eq('payment_intent_id', alias); // el alias que mandamos era el paymentIntentId

      if (error) {
        console.error('Error updating order on SIP Callback:', error);
        return NextResponse.json({ codigo: "9999", mensaje: "Error base de datos" }, { status: 500 });
      }
    }

    // Respuesta esperada de éxito por SIP:
    // { "codigo": "0000", "mensaje": "Registro Exitoso" }
    return NextResponse.json({
      codigo: "0000",
      mensaje: "Registro Exitoso"
    });

  } catch (error: any) {
    console.error('SIP Callback Error:', error);
    // Si hay error no controlado, retornamos algo distinto a 0000 para que SIP notifique el fallo si es necesario
    return NextResponse.json({ codigo: "9999", mensaje: error.message }, { status: 500 });
  }
}
