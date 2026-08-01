"use client";

import { Order } from "@shared/types";
import { generateShortOrderCode, getTimeAgo } from "@shared/utils";
import { NEXT_STATUS, NEXT_STATUS_ACTION_LABEL } from "@shared/constants";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { Clock, Printer } from "lucide-react";

interface KitchenOrderCardProps {
  order: Order;
  stationId?: string;
}

export function KitchenOrderCard({ order, stationId }: KitchenOrderCardProps) {
  const { updateStatus, loading } = useUpdateOrderStatus();
  const nextStatus = NEXT_STATUS[order.status];
  const actionLabel = NEXT_STATUS_ACTION_LABEL[order.status];

  const handleAction = async () => {
    if (nextStatus) {
      await updateStatus(order.id, nextStatus, order.restaurant_id);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = (order.order_items || [])
      .filter(item => !stationId || item.station_id === stationId || item.station_id === null)
      .map(
        item => `
        <div style="margin-bottom: 8px;">
          <strong style="font-size: 16px;">${item.quantity}x ${item.product_name}</strong>
          ${item.notes ? `<br/><i style="font-size: 14px;">Nota: ${item.notes}</i>` : ""}
        </div>
      `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Pedido ${generateShortOrderCode(order.id)}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            h2 { font-size: 18px; margin-top: 0; color: #555; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .items { margin-top: 20px; }
            .footer { margin-top: 30px; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>MESA ${order.table_number}</h1>
          <h2>Pedido #${generateShortOrderCode(order.id)}</h2>
          <div class="items">
            ${itemsHtml}
          </div>
          <div class="footer">
            Fecha: ${new Date(order.created_at).toLocaleString()}
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

  const borderColors: Record<string, string> = {
    sent: "border-l-[#3B82F6]",
    received: "border-l-[#F4B942]",
    preparing: "border-l-[#E76F51]",
    ready: "border-l-[#2E7D32]",
  };

  const btnClasses: Record<string, string> = {
    sent: "border border-[#3B82F6] bg-[#EFF6FF] text-[#3B82F6] hover:bg-blue-100",
    received: "bg-[#E76F51] text-white hover:bg-[#d65e40]",
    preparing: "bg-[#2E7D32] text-white hover:bg-[#256629]",
  };

  if (!nextStatus || order.status === "ready") return null;

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] border-l-4 ${borderColors[order.status] || "border-l-gray-300"} flex flex-col h-full`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-[#1F2933]">Mesa {order.table_number}</h2>
          <p className="text-sm text-[#6B7280] mt-1">Pedido: {generateShortOrderCode(order.id)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center text-[#6B7280]">
            <Clock size={16} className="mr-1" />
            <span className="text-md font-medium">{getTimeAgo(order.created_at)}</span>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-8 flex-1">
        {order.order_items?.filter(item => !stationId || item.station_id === stationId || item.station_id === null).map((item) => (
          <div key={item.id}>
            <p className="text-xl text-[#1F2933]">
              <span className="font-bold text-[#E76F51] mr-2">{item.quantity}x</span> 
              {item.product_name}
            </p>
            {item.notes && (
              <div className="mt-2 bg-[#FEF3CD] text-[#92400E] px-3 py-2 rounded-xl text-md inline-block">
                ⚠️ {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAction}
        disabled={loading}
        className={`w-full h-16 rounded-xl text-xl font-bold transition-colors disabled:opacity-50 ${btnClasses[order.status] || ""}`}
      >
        {loading ? "Actualizando..." : actionLabel}
      </button>
    </div>
  );
}
