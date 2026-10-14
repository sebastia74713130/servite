import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cuf = searchParams.get('cuf');
  const orderId = searchParams.get('orderId');
  const tableId = searchParams.get('tableId');
  const restaurantId = searchParams.get('restaurantId');

  // Detect mobile devices on server
  const userAgent = req.headers.get('user-agent') || '';
  const isMobileServer = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const autoPrint = !isMobileServer && searchParams.get('autoPrint') === 'true';

  let invoice: any = null;

  // 1. Fetch by CUF if provided
  if (cuf) {
    const { data: inv } = await supabaseAdmin
      .from('invoices')
      .select('*, restaurants(id, name, address, phone, city, logo_url), orders(*, order_items(*), tables(table_number, type))')
      .eq('cuf', cuf)
      .single();
    invoice = inv;
  }

  // 2. Fallback to orderId
  if (!invoice && orderId) {
    const { data: inv } = await supabaseAdmin
      .from('invoices')
      .select('*, restaurants(id, name, address, phone, city, logo_url), orders(*, order_items(*), tables(table_number, type))')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    invoice = inv;
  }

  // 3. Fallback to tableId (lookup latest invoice associated with table's recent orders)
  if (!invoice && tableId) {
    const { data: tableOrders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('table_id', tableId)
      .order('created_at', { ascending: false })
      .limit(10);

    const orderIds = (tableOrders || []).map((o: any) => o.id);
    if (orderIds.length > 0) {
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('*, restaurants(id, name, address, phone, city, logo_url), orders(*, order_items(*), tables(table_number, type))')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      invoice = inv;
    }
  }

  // If no SIAT invoice is registered for this session, fallback cleanly to comprobante de venta
  if (!invoice) {
    if (tableId) {
      const fallbackUrl = new URL('/api/receipt/print', req.url);
      fallbackUrl.searchParams.set('tableId', tableId);
      if (restaurantId) fallbackUrl.searchParams.set('restaurantId', restaurantId);
      return NextResponse.redirect(fallbackUrl.toString());
    }
    return new NextResponse('Factura no encontrada', { status: 404 });
  }

  const restaurantName = invoice.restaurants?.name || 'Servido';
  const restaurantAddress = invoice.restaurants?.address || '';
  const restaurantPhone = invoice.restaurants?.phone || '';
  const restaurantCity = invoice.restaurants?.city || '';

  const order = invoice.orders;
  const nitCi = order?.customer_nit || '99002';
  const rznSocial = order?.customer_name || 'S/N';
  const items = order?.order_items || [];
  const totalAmount = order?.total || 0;
  const paymentMethod = order?.payment_method || 'Efectivo';
  const numeroFactura = invoice.numero_factura || '0001';
  const invoiceCuf = invoice.cuf || cuf || '';

  let tableName = 'Mesa';
  if (order?.tables) {
    tableName = order.tables.type === 'takeaway'
      ? `Barra ${order.tables.table_number}`
      : `Mesa ${order.tables.table_number}`;
  } else if (order?.table_number) {
    tableName = order.table_number.toLowerCase().startsWith('mesa') || order.table_number.toLowerCase().startsWith('barra')
      ? order.table_number
      : `Mesa ${order.table_number}`;
  }

  // Momento de emisión del comprobante (hora Bolivia UTC -4: America/La_Paz)
  const emissionDate = invoice.created_at ? new Date(invoice.created_at) : (order?.paid_at ? new Date(order.paid_at) : new Date());

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

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Factura Electrónica - ${restaurantName}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #F3F4F6;
            margin: 0;
            padding: 16px 12px;
            color: #111827;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
          }
          .ticket {
            background: #FFFFFF;
            width: 100%;
            max-width: 340px;
            padding: 24px 18px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
            font-size: 13px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #D1D5DB;
            padding-bottom: 14px;
            margin-bottom: 14px;
          }
          .restaurant-name {
            font-size: 19px;
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
            margin-top: 10px;
            padding: 5px 12px;
            background: #EFF6FF;
            color: #1E40AF;
            border: 1px solid #BFDBFE;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .legal-notice {
            font-size: 9px;
            font-weight: 700;
            color: #2563EB;
            margin-top: 6px;
            text-transform: uppercase;
            line-height: 1.3;
          }
          .meta {
            font-size: 11px;
            color: #374151;
            margin-bottom: 14px;
            border-bottom: 1px dashed #D1D5DB;
            padding-bottom: 12px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .meta-label {
            color: #6B7280;
          }
          .meta-value {
            font-weight: 700;
            text-align: right;
            max-width: 60%;
            word-break: break-word;
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
            margin-bottom: 7px;
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
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            padding-top: 4px;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #4B5563;
            margin-top: 6px;
          }
          .cuf-container {
            margin-top: 14px;
            padding: 10px;
            background: #F9FAFB;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            text-align: center;
          }
          .cuf-label {
            font-size: 10px;
            font-weight: 800;
            color: #4B5563;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .cuf-code {
            font-family: monospace;
            font-size: 9px;
            color: #1F2937;
            word-break: break-all;
            margin-top: 4px;
            line-height: 1.3;
          }
          .footer {
            text-align: center;
            font-size: 9px;
            color: #6B7280;
            margin-top: 14px;
            border-top: 1px dotted #E5E7EB;
            padding-top: 12px;
            line-height: 1.4;
          }
          .actions {
            margin-top: 18px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            max-width: 340px;
          }
          .btn-action {
            width: 100%;
            padding: 14px 16px;
            border: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            text-decoration: none;
            -webkit-tap-highlight-color: transparent;
          }
          .btn-download {
            background: #2E7D32;
            color: #FFFFFF;
            box-shadow: 0 3px 10px rgba(46, 125, 50, 0.25);
          }
          .btn-download:hover {
            background: #256629;
          }
          .btn-download:active {
            transform: scale(0.98);
          }
          .btn-print {
            background: #111827;
            color: #FFFFFF;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .btn-print:hover {
            background: #1F2937;
          }
          .btn-print:active {
            transform: scale(0.98);
          }
          @media (max-width: 768px) {
            .desktop-only {
              display: none !important;
            }
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
            .actions {
              display: none !important;
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
            
            <div class="doc-badge">Factura Electrónica (SIAT)</div>
            <div class="legal-notice">
              Con Derecho a Crédito Fiscal<br/>
              Sistema de Facturación en Línea
            </div>
          </div>

          <div class="meta">
            <div class="meta-row">
              <span class="meta-label">Nro. Factura:</span>
              <span class="meta-value">${numeroFactura}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">NIT / CI:</span>
              <span class="meta-value">${nitCi}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Razón Social:</span>
              <span class="meta-value">${rznSocial}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Ubicación:</span>
              <span class="meta-value">${tableName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Fecha y Hora:</span>
              <span class="meta-value">${formattedDate} ${formattedTime}</span>
            </div>
          </div>

          <div class="items">
            ${items.map((item: any) => `
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
              <span>Bs ${Number(totalAmount).toLocaleString('es-BO')}</span>
            </div>
            <div class="payment-row">
              <span>Monto Sujeto a Crédito Fiscal:</span>
              <span style="font-weight:700;">Bs ${Number(totalAmount).toLocaleString('es-BO')}</span>
            </div>
            <div class="payment-row">
              <span>Forma de Pago:</span>
              <span style="font-weight:600;">${paymentMethod}</span>
            </div>
          </div>

          <div class="cuf-container">
            <div class="cuf-label">Código Único de Factura (CUF)</div>
            <div class="cuf-code">${invoiceCuf}</div>
          </div>

          <div class="footer">
            "ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"<br/><br/>
            Ley Nº 453: Los servicios deben prestarse en condiciones de inocuidad, calidad y seguridad.<br/><br/>
            Sistema de Gestión Servido
          </div>
        </div>

        <div class="actions">
          <button id="btnDownload" class="btn-action btn-download" onclick="downloadInvoice()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Descargar Factura</span>
          </button>
          
          <button id="btnPrint" class="btn-action btn-print desktop-only" onclick="window.print()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>Imprimir Factura</span>
          </button>
        </div>

        <script>
          // Detect mobile device
          var isMobileClient = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
          if (isMobileClient) {
            var printEl = document.getElementById('btnPrint');
            if (printEl) printEl.style.display = 'none';
          }

          ${autoPrint ? `
          window.onload = function() {
            if (!isMobileClient) {
              window.print();
            }
          };
          ` : ''}

          function downloadInvoice() {
            var btn = document.getElementById('btnDownload');
            if (btn) {
              btn.disabled = true;
              btn.style.opacity = '0.7';
            }

            try {
              var scale = 2;
              var width = 360 * scale;
              var padding = 20 * scale;
              var contentWidth = width - (padding * 2);

              var restaurantName = ${JSON.stringify(restaurantName)};
              var restaurantAddress = ${JSON.stringify(restaurantAddress)};
              var restaurantCity = ${JSON.stringify(restaurantCity)};
              var restaurantPhone = ${JSON.stringify(restaurantPhone)};
              var numeroFactura = ${JSON.stringify(numeroFactura)};
              var nitCi = ${JSON.stringify(nitCi)};
              var rznSocial = ${JSON.stringify(rznSocial)};
              var tableName = ${JSON.stringify(tableName)};
              var formattedDate = ${JSON.stringify(formattedDate)};
              var formattedTime = ${JSON.stringify(formattedTime)};
              var paymentMethod = ${JSON.stringify(paymentMethod)};
              var totalAmount = ${JSON.stringify(Number(totalAmount).toLocaleString('es-BO'))};
              var invoiceCuf = ${JSON.stringify(invoiceCuf)};
              var items = ${JSON.stringify(items.map((i: any) => ({
                qty: i.quantity,
                name: i.product_name,
                price: Number(i.total_price || (i.unit_price * i.quantity) || 0).toLocaleString('es-BO')
              })))};

              var estimatedHeight = (340 + (items.length * 28) + (restaurantAddress ? 16 : 0) + ((restaurantCity || restaurantPhone) ? 16 : 0)) * scale;

              var canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = estimatedHeight;

              var ctx = canvas.getContext('2d');
              if (!ctx) return;

              // White background
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, estimatedHeight);

              var baseFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
              var y = padding + (12 * scale);

              // Restaurant Name
              ctx.fillStyle = '#111827';
              ctx.font = 'bold ' + (18 * scale) + 'px ' + baseFont;
              ctx.textAlign = 'center';
              ctx.fillText(restaurantName.toUpperCase(), width / 2, y);
              y += (22 * scale);

              if (restaurantAddress) {
                ctx.fillStyle = '#4B5563';
                ctx.font = (11 * scale) + 'px ' + baseFont;
                ctx.fillText(restaurantAddress, width / 2, y);
                y += (16 * scale);
              }

              if (restaurantCity || restaurantPhone) {
                ctx.fillStyle = '#4B5563';
                ctx.font = (11 * scale) + 'px ' + baseFont;
                var info = (restaurantCity ? restaurantCity + ' • ' : '') + (restaurantPhone ? 'Tel: ' + restaurantPhone : '');
                ctx.fillText(info, width / 2, y);
                y += (16 * scale);
              }

              // Badge: FACTURA ELECTRÓNICA (SIAT)
              y += (6 * scale);
              ctx.fillStyle = '#EFF6FF';
              var badgeWidth = 210 * scale;
              var badgeHeight = 24 * scale;
              var bx = (width - badgeWidth) / 2;
              var by = y - (17 * scale);
              if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(bx, by, badgeWidth, badgeHeight, 6 * scale);
                ctx.fill();
              } else {
                ctx.fillRect(bx, by, badgeWidth, badgeHeight);
              }

              ctx.fillStyle = '#1E40AF';
              ctx.font = 'bold ' + (11 * scale) + 'px ' + baseFont;
              ctx.fillText('FACTURA ELECTRÓNICA (SIAT)', width / 2, y);
              y += (18 * scale);

              // Legal text
              ctx.fillStyle = '#2563EB';
              ctx.font = 'bold ' + (9 * scale) + 'px ' + baseFont;
              ctx.fillText('CON DERECHO A CRÉDITO FISCAL', width / 2, y);
              y += (13 * scale);
              ctx.fillText('SISTEMA DE FACTURACIÓN EN LÍNEA', width / 2, y);
              y += (16 * scale);

              // Dashed line helper
              function drawDashedLine(currentY) {
                ctx.strokeStyle = '#D1D5DB';
                ctx.lineWidth = 1 * scale;
                ctx.setLineDash([4 * scale, 3 * scale]);
                ctx.beginPath();
                ctx.moveTo(padding, currentY);
                ctx.lineTo(width - padding, currentY);
                ctx.stroke();
                ctx.setLineDash([]);
              }

              drawDashedLine(y);
              y += (16 * scale);

              // Meta rows
              function drawMetaRow(label, value) {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#6B7280';
                ctx.font = (11 * scale) + 'px ' + baseFont;
                ctx.fillText(label, padding, y);

                ctx.textAlign = 'right';
                ctx.fillStyle = '#111827';
                ctx.font = 'bold ' + (11 * scale) + 'px ' + baseFont;
                ctx.fillText(value, width - padding, y);
                y += (18 * scale);
              }

              drawMetaRow('Nro. Factura:', numeroFactura);
              drawMetaRow('NIT / CI:', nitCi);
              drawMetaRow('Razón Social:', rznSocial);
              drawMetaRow('Ubicación:', tableName);
              drawMetaRow('Fecha y Hora:', formattedDate + ' ' + formattedTime);

              y += (4 * scale);
              drawDashedLine(y);
              y += (18 * scale);

              // Items
              items.forEach(function(item) {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#111827';
                ctx.font = 'bold ' + (12 * scale) + 'px ' + baseFont;
                var qtyText = item.qty + 'x ';
                ctx.fillText(qtyText, padding, y);

                var qtyWidth = ctx.measureText(qtyText).width;
                ctx.font = (12 * scale) + 'px ' + baseFont;
                var maxNameWidth = contentWidth - qtyWidth - (80 * scale);
                var name = item.name;
                if (ctx.measureText(name).width > maxNameWidth) {
                  while (name.length > 3 && ctx.measureText(name + '...').width > maxNameWidth) {
                    name = name.slice(0, -1);
                  }
                  name += '...';
                }
                ctx.fillText(name, padding + qtyWidth, y);

                ctx.textAlign = 'right';
                ctx.font = 'bold ' + (12 * scale) + 'px ' + baseFont;
                ctx.fillText('Bs ' + item.price, width - padding, y);
                y += (22 * scale);
              });

              y += (4 * scale);
              drawDashedLine(y);
              y += (20 * scale);

              // Total
              ctx.textAlign = 'left';
              ctx.fillStyle = '#111827';
              ctx.font = 'bold ' + (16 * scale) + 'px ' + baseFont;
              ctx.fillText('TOTAL', padding, y);

              ctx.textAlign = 'right';
              ctx.fillText('Bs ' + totalAmount, width - padding, y);
              y += (24 * scale);

              // Payment Method
              ctx.textAlign = 'left';
              ctx.fillStyle = '#6B7280';
              ctx.font = (11 * scale) + 'px ' + baseFont;
              ctx.fillText('Forma de Pago:', padding, y);

              ctx.textAlign = 'right';
              ctx.fillStyle = '#111827';
              ctx.font = 'bold ' + (11 * scale) + 'px ' + baseFont;
              ctx.fillText(paymentMethod, width - padding, y);
              y += (22 * scale);

              // CUF Box
              drawDashedLine(y);
              y += (16 * scale);

              ctx.textAlign = 'center';
              ctx.fillStyle = '#4B5563';
              ctx.font = 'bold ' + (9 * scale) + 'px ' + baseFont;
              ctx.fillText('CÓDIGO ÚNICO DE FACTURA (CUF)', width / 2, y);
              y += (14 * scale);

              ctx.font = (8 * scale) + 'px monospace';
              ctx.fillStyle = '#1F2937';
              ctx.fillText(invoiceCuf.substring(0, 32), width / 2, y);
              y += (12 * scale);
              if (invoiceCuf.length > 32) {
                ctx.fillText(invoiceCuf.substring(32), width / 2, y);
                y += (12 * scale);
              }

              // Footer
              y += (6 * scale);
              ctx.strokeStyle = '#E5E7EB';
              ctx.lineWidth = 1 * scale;
              ctx.setLineDash([2 * scale, 2 * scale]);
              ctx.beginPath();
              ctx.moveTo(padding, y);
              ctx.lineTo(width - padding, y);
              ctx.stroke();
              ctx.setLineDash([]);
              y += (16 * scale);

              ctx.textAlign = 'center';
              ctx.fillStyle = '#6B7280';
              ctx.font = (9 * scale) + 'px ' + baseFont;
              ctx.fillText('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS"', width / 2, y);
              y += (12 * scale);
              ctx.fillText('Sistema de Gestión Servido', width / 2, y);

              // Trigger download or share
              canvas.toBlob(function(blob) {
                if (btn) {
                  btn.disabled = false;
                  btn.style.opacity = '1';
                }
                if (!blob) return;

                var filename = 'Factura-' + numeroFactura + '.png';

                // Try Web Share API if supported
                if (navigator.share && navigator.canShare) {
                  try {
                    var file = new File([blob], filename, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                      navigator.share({
                        files: [file],
                        title: 'Factura Electrónica - ' + restaurantName,
                        text: 'Factura Nro. ' + numeroFactura + ' - ' + restaurantName
                      }).catch(function(err) {
                        if (err.name !== 'AbortError') {
                          fallbackDownload(blob, filename);
                        }
                      });
                      return;
                    }
                  } catch (e) {
                    // Fallback to normal download
                  }
                }

                fallbackDownload(blob, filename);
              }, 'image/png');

            } catch (err) {
              console.error('Error generando factura:', err);
              if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
              }
            }

            function fallbackDownload(blob, filename) {
              var url = URL.createObjectURL(blob);
              var link = document.createElement('a');
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
            }
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
