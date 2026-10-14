import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const tableId = searchParams.get('tableId');
  const autoPrint = searchParams.get('autoPrint') === 'true';

  if (!orderId && !tableId) {
    return new NextResponse('Falta parámetro orderId o tableId', { status: 400 });
  }

  let orders: any[] = [];
  let restaurant: any = null;
  let tableName = 'Mesa';

  if (orderId) {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), restaurants(id, name, address, phone, city, logo_url), tables(table_number, type)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }

    orders = [order];
    restaurant = order.restaurants;
    if (order.tables) {
      tableName = order.tables.type === 'takeaway' 
        ? `Barra ${order.tables.table_number}` 
        : `Mesa ${order.tables.table_number}`;
    } else if (order.table_number) {
      tableName = order.table_number;
    }
  } else if (tableId) {
    const { data: tableData } = await supabaseAdmin
      .from('tables')
      .select('*, restaurants(id, name, address, phone, city, logo_url)')
      .eq('id', tableId)
      .single();

    if (!tableData) {
      return new NextResponse('Mesa no encontrada', { status: 404 });
    }

    restaurant = tableData.restaurants;
    tableName = tableData.type === 'takeaway' 
      ? `Barra ${tableData.table_number}` 
      : `Mesa ${tableData.table_number}`;

    const { data: tableOrders } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('table_id', tableId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tableOrders && tableOrders.length > 0) {
      const latestOrder = tableOrders[0];
      if (latestOrder.paid_at) {
        const latestPaidTime = new Date(latestOrder.paid_at).getTime();
        orders = tableOrders.filter((o) => {
          if (!o.paid_at) return false;
          const diff = Math.abs(new Date(o.paid_at).getTime() - latestPaidTime);
          return diff < 5 * 60 * 1000;
        });
      } else {
        orders = tableOrders.filter((o) => !o.is_paid);
      }
      if (orders.length === 0) {
        orders = [latestOrder];
      }
    } else {
      orders = [];
    }
  }

  const restaurantName = restaurant?.name || 'Servido';
  const restaurantAddress = restaurant?.address || '';
  const restaurantPhone = restaurant?.phone || '';
  const restaurantCity = restaurant?.city || '';

  // Consolidar todos los ítems y totales
  const allItems: any[] = [];
  let totalAmount = 0;
  let customerName = '';
  let paymentMethod = 'Efectivo';

  // Momento de emisión del comprobante (hora Bolivia UTC -4: America/La_Paz)
  const paidOrder = orders.find((o) => o.paid_at);
  const emissionDate = paidOrder?.paid_at ? new Date(paidOrder.paid_at) : new Date();

  orders.forEach((o) => {
    totalAmount += Number(o.total || 0);
    if (o.customer_name) customerName = o.customer_name;
    if (o.payment_method) paymentMethod = o.payment_method;

    (o.order_items || []).forEach((item: any) => {
      allItems.push(item);
    });
  });

  const formattedDate = emissionDate.toLocaleDateString('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = emissionDate.toLocaleTimeString('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const orderCode = orderId ? `#${orderId.slice(-6).toUpperCase()}` : `LOTE-${orders[0]?.id?.slice(-4).toUpperCase() || '01'}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprobante de Venta - ${restaurantName}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            background: #F3F4F6;
            margin: 0;
            padding: 12px;
            color: #111827;
            display: flex;
            justify-content: center;
          }
          .ticket {
            background: #FFFFFF;
            width: 100%;
            max-width: 320px;
            padding: 20px 16px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            font-size: 13px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #D1D5DB;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .restaurant-name {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin: 0 0 4px 0;
            text-transform: uppercase;
          }
          .restaurant-info {
            font-size: 11px;
            color: #4B5563;
            margin: 2px 0;
          }
          .doc-badge {
            display: inline-block;
            margin-top: 8px;
            padding: 4px 8px;
            background: #F3F4F6;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .legal-notice {
            font-size: 9px;
            font-weight: 700;
            color: #6B7280;
            margin-top: 6px;
            text-transform: uppercase;
            line-height: 1.2;
          }
          .meta {
            font-size: 11px;
            color: #374151;
            margin-bottom: 12px;
            border-bottom: 1px dashed #D1D5DB;
            padding-bottom: 10px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .meta-label {
            color: #6B7280;
          }
          .meta-value {
            font-weight: 600;
          }
          .items {
            margin-bottom: 14px;
            border-bottom: 1px dashed #D1D5DB;
            padding-bottom: 12px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
            font-size: 12px;
          }
          .item-desc {
            flex: 1;
            padding-right: 8px;
          }
          .item-qty {
            font-weight: 700;
            color: #111827;
          }
          .item-price {
            font-weight: 700;
            text-align: right;
            white-space: nowrap;
          }
          .totals {
            margin-bottom: 14px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            font-weight: 800;
            color: #111827;
            padding-top: 4px;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #4B5563;
            margin-top: 4px;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #9CA3AF;
            margin-top: 14px;
            border-top: 1px dotted #E5E7EB;
            padding-top: 10px;
          }
          .btn-print {
            margin-top: 16px;
            width: 100%;
            padding: 12px;
            background: #111827;
            color: #FFFFFF;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          }
          .btn-print:hover {
            background: #1F2937;
          }
          @media print {
            body {
              background: #FFFFFF;
              padding: 0;
            }
            .ticket {
              box-shadow: none;
              padding: 0;
              max-width: 100%;
            }
            .btn-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1 class="restaurant-name">${restaurantName}</h1>
            ${restaurantAddress ? `<p class="restaurant-info">${restaurantAddress}</p>` : ''}
            ${restaurantCity || restaurantPhone ? `<p class="restaurant-info">${restaurantCity ? restaurantCity + ' • ' : ''}${restaurantPhone ? 'Tel: ' + restaurantPhone : ''}</p>` : ''}
            
            <div class="doc-badge">Comprobante de Venta</div>
            <div class="legal-notice">
              Régimen Tributario Simplificado<br/>
              Documento no válido para crédito fiscal
            </div>
          </div>

          <div class="meta">
            <div class="meta-row">
              <span class="meta-label">Ticket / Pedido:</span>
              <span class="meta-value">${orderCode}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Ubicación:</span>
              <span class="meta-value">${tableName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Fecha y Hora:</span>
              <span class="meta-value">${formattedDate} ${formattedTime}</span>
            </div>
            ${customerName ? `
            <div class="meta-row">
              <span class="meta-label">Cliente:</span>
              <span class="meta-value">${customerName}</span>
            </div>
            ` : ''}
          </div>

          <div class="items">
            ${allItems.map((item: any) => `
              <div class="item-row">
                <div class="item-desc">
                  <span class="item-qty">${item.quantity}x</span> ${item.product_name}
                </div>
                <div class="item-price">
                  Bs ${Number(item.total_price || item.unit_price * item.quantity || 0).toLocaleString('es-BO')}
                </div>
              </div>
            `).join('')}
          </div>

          <div class="totals">
            <div class="total-row">
              <span>TOTAL</span>
              <span>Bs ${totalAmount.toLocaleString('es-BO')}</span>
            </div>
            <div class="payment-row">
              <span>Forma de Pago:</span>
              <span style="font-weight:600;">${paymentMethod}</span>
            </div>
          </div>

          <div class="footer">
            ¡Muchas gracias por su visita!<br/>
            Sistema de Gestión Servido
          </div>

          <button class="btn-print" onclick="window.print()">
            Imprimir Comprobante
          </button>
        </div>

        ${autoPrint ? `
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
        ` : ''}
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}

