"use client";

import { useState } from "react";
import { Order } from "@shared/types";
import { formatPrice, generateShortOrderCode, getTimeAgo } from "@shared/utils";
import { NEXT_STATUS, NEXT_STATUS_ACTION_LABEL } from "@shared/constants";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { Printer } from "lucide-react";

interface OrderCardProps {
  orders: Order[];
  stations: any[];
  onDismiss?: () => void;
}

export function OrderCard({ orders, stations, onDismiss }: OrderCardProps) {
  const { updateStatus, loading } = useUpdateOrderStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const primaryOrder = orders[0];
  const nextStatus = NEXT_STATUS[primaryOrder.status];
  const actionLabel = NEXT_STATUS_ACTION_LABEL[primaryOrder.status];
  const total = orders.reduce((sum, o) => sum + o.total, 0);

  const allItems = orders.flatMap(o => o.order_items || []);
  const displayedItems = isExpanded ? allItems : allItems.slice(0, 4);
  const hiddenCount = allItems.length - 4;

  const handleAction = async () => {
    if (nextStatus) {
      // Update all orders in the group simultaneously
      await Promise.all(orders.map(o => updateStatus(o.id, nextStatus)));
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = orders.flatMap(o => o.order_items || [])
      .map(
        item => `
        <div style="margin-bottom: 8px;">
          <strong style="font-size: 16px;">${item.quantity}x ${item.product_name}</strong>
          ${item.notes ? `<br/><i style="font-size: 14px;">Nota: ${item.notes}</i>` : ""}
        </div>
      `
      )
      .join("");

    const orderCodes = orders.map(o => generateShortOrderCode(o.id)).join(", ");

    const html = `
      <html>
        <head>
          <title>Pedido ${orderCodes}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            h2 { font-size: 18px; margin-top: 0; color: #555; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .items { margin-top: 20px; }
            .footer { margin-top: 30px; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>${tableName.toUpperCase()}</h1>
          <h2>Pedido #${orderCodes}</h2>
          <div class="items">
            ${itemsHtml}
          </div>
          <div class="footer">
            Total: ${formatPrice(total)}<br/>
            Fecha: ${new Date(primaryOrder.created_at).toLocaleString()}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const actionColors: Record<string, string> = {
    sent: "border-[#3B82F6] text-[#3B82F6] hover:bg-blue-50",
    received: "bg-[#E76F51] text-white hover:bg-[#d65e40]",
    preparing: "bg-[#2E7D32] text-white hover:bg-[#256629]",
    ready: "border-[#6B7280] text-[#6B7280] hover:bg-gray-50",
  };

  const btnClass = primaryOrder.status === "sent" || primaryOrder.status === "ready"
    ? `border ${actionColors[primaryOrder.status]}`
    : actionColors[primaryOrder.status];

  const tableName = String(primaryOrder.table_number).toLowerCase().includes('mesa') 
    ? primaryOrder.table_number 
    : `Mesa ${primaryOrder.table_number}`;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-[#1F2933]">{tableName}</h3>
            {orders.map(o => {
              const stationId = o.order_items?.[0]?.station_id;
              const station = stations?.find(s => s.id === stationId);
              if (!station) return null;
              return (
                <span key={o.id} className="text-xs font-bold bg-[#1F2933] text-white px-2 py-1 rounded uppercase tracking-wider shadow-sm">
                  {station.name}
                </span>
              );
            })}
          </div>
          <p className="text-xs text-[#6B7280]">
            {orders.length === 1 
              ? `#${generateShortOrderCode(primaryOrder.id)}` 
              : `${orders.length} pedidos combinados`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
          <div className="flex items-center gap-1">
          <button 
            onClick={handlePrint}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Imprimir comanda"
          >
            <Printer size={18} />
          </button>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Ocultar pedido"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
        </div>
          <span className="text-xs text-[#6B7280] whitespace-nowrap">{getTimeAgo(primaryOrder.created_at)}</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {displayedItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="text-sm">
            <div className="flex justify-between">
              <span className="text-[#1F2933]"><span className="font-bold">{item.quantity}x</span> {item.product_name}</span>
            </div>
            {item.notes && (
              <p className="text-xs text-[#E76F51] italic mt-0.5 ml-4">Nota: {item.notes}</p>
            )}
          </div>
        ))}
        
        {!isExpanded && hiddenCount > 0 && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-700 py-2 border-t border-dashed border-gray-200 mt-2 flex items-center justify-center gap-1 transition-colors"
          >
            Ver {hiddenCount} más
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        )}
        
        {isExpanded && hiddenCount > 0 && (
          <button 
            onClick={() => setIsExpanded(false)}
            className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-700 py-2 border-t border-dashed border-gray-200 mt-2 flex items-center justify-center gap-1 transition-colors"
          >
            Ocultar
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#E5E7EB]">
        <span className="font-bold text-[#1F2933]">{formatPrice(total)}</span>
        
        {nextStatus && (
          <button
            onClick={handleAction}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${btnClass}`}
          >
            {loading ? "..." : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
