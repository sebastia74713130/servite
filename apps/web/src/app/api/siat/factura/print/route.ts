import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cuf = searchParams.get('cuf');

  if (!cuf) {
    return new NextResponse('Missing CUF', { status: 400 });
  }

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .select('*, restaurants(name), orders(*, order_items(*))')
    .eq('cuf', cuf)
    .single();

  if (invoiceError || !invoice) {
    return new NextResponse('Invoice not found', { status: 404 });
  }

  const restaurantName = invoice.restaurants?.name || "Servido";
  const order = invoice.orders;
  
  // Extract nit and razonsocial from order or fallback
  const nitCi = order?.customer_nit || '99002';
  const rznSocial = order?.customer_name || 'S/N';
  const items = order?.order_items || [];
  const totalAmount = order?.total || 0;

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura SIAT</title>
        <style>
          body { font-family: monospace; padding: 20px; color: #000; max-width: 350px; margin: 0 auto; text-align: center; background: #f9fafb;}
          .ticket { background: #fff; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px;}
          h1 { font-size: 20px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 0; margin-bottom: 20px;}
          .items { text-align: left; margin-top: 20px; margin-bottom: 20px;}
          .footer { font-size: 11px; margin-top: 20px; text-align: center;}
          .btn-print { margin-top: 30px; padding: 12px 20px; background: #E76F51; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: sans-serif; font-weight: bold; width: 100%; font-size: 16px; box-shadow: 0 4px 10px rgba(231,111,81,0.3);}
          @media print { 
            body { background: #fff; padding: 0; }
            .ticket { box-shadow: none; padding: 0; }
            .btn-print { display: none; } 
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h1>FACTURA ELECTRÓNICA</h1>
          <h2>${restaurantName}</h2>
          <div style="text-align:left; font-size:12px; margin-bottom: 10px;">
            NIT/CI: ${nitCi}<br/>
            Razón Social: ${rznSocial}
          </div>
          <div class="items">
            ${items.map((item: any) => `
              <div style="margin-bottom: 5px; display: flex; justify-content: space-between; font-size: 12px;">
                <span style="flex: 1;">${item.quantity}x ${item.product_name}</span>
                <span style="margin-left: 10px;">Bs ${item.total_price.toLocaleString('es-BO')}</span>
              </div>
            `).join('')}
          </div>
          <div style="text-align: right; font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 10px;">
            TOTAL: Bs ${totalAmount.toLocaleString('es-BO')}
          </div>
          <div class="footer">
            ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY<br/><br/>
            CUF: <br/>
            <span style="word-break: break-all; font-size: 9px; color: #666;">${cuf}</span>
          </div>
          <button class="btn-print" onclick="window.print()">Descargar en PDF</button>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

