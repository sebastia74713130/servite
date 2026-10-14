"use client";

import { useState, useEffect } from "react";
import { Order } from "@shared/types";
import { generateShortOrderCode, getTimeAgo } from "@shared/utils";
import { NEXT_STATUS, NEXT_STATUS_ACTION_LABEL } from "@shared/constants";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { Clock, Printer, Minus, Plus, ChefHat, User, CheckCircle, AlertCircle } from "lucide-react";

interface KitchenOrderCardProps {
  order: Order;
  stationId?: string;
}

export function KitchenOrderCard({ order, stationId }: KitchenOrderCardProps) {
  const { updateStatus, loading } = useUpdateOrderStatus();
  const nextStatus = NEXT_STATUS[order.status];
  const actionLabel = NEXT_STATUS_ACTION_LABEL[order.status];

  // Estimated preparation time selector state (default 20 minutes)
  const [prepMinutes, setPrepMinutes] = useState<number>(order.estimated_prep_minutes || 20);
  const [now, setNow] = useState(Date.now());

  // Keep countdown updated every 30 seconds
  useEffect(() => {
    if (order.status === "preparing") {
      const interval = setInterval(() => setNow(Date.now()), 30000);
      return () => clearInterval(interval);
    }
  }, [order.status]);

  const handleStartPreparing = async () => {
    const minutes = prepMinutes > 0 ? prepMinutes : 15;
    const estimatedReadyAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await updateStatus(order.id, "preparing", order.restaurant_id, {
      estimated_prep_minutes: minutes,
      estimated_ready_at: estimatedReadyAt,
    });
  };

  const handleAdd5Minutes = async () => {
    const baseTime = order.estimated_ready_at ? new Date(order.estimated_ready_at).getTime() : Date.now();
    const newReadyAt = new Date(Math.max(baseTime, Date.now()) + 5 * 60 * 1000).toISOString();
    const newMinutes = (order.estimated_prep_minutes || 0) + 5;
    await updateStatus(order.id, "preparing", order.restaurant_id, {
      estimated_prep_minutes: newMinutes,
      estimated_ready_at: newReadyAt,
    });
  };

  const handleMarkReady = async () => {
    await updateStatus(order.id, "ready", order.restaurant_id);
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
          <h1>MESA ${order.table_number || "BARRA"}</h1>
          ${order.customer_name ? `<h3>Cliente: ${order.customer_name}</h3>` : ""}
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

  if (!nextStatus || order.status === "ready") return null;

  // Calculate remaining minutes for preparing orders
  let remainingMinutesText = "";
  let readyFormattedTime = "";
  let isDelayed = false;

  if (order.status === "preparing" && order.estimated_ready_at) {
    const readyMs = new Date(order.estimated_ready_at).getTime();
    const diffMinutes = Math.round((readyMs - now) / 60000);
    if (diffMinutes <= 0) {
      isDelayed = true;
      remainingMinutesText = `¡Listo o demorado! (+${Math.abs(diffMinutes)} min)`;
    } else {
      remainingMinutesText = `Faltan aprox. ${diffMinutes} min`;
    }

    try {
      readyFormattedTime = new Intl.DateTimeFormat("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/La_Paz",
      }).format(new Date(order.estimated_ready_at));
    } catch {
      readyFormattedTime = "";
    }
  }

  const isTakeaway = order.table_number?.toUpperCase().startsWith("BARRA") || order.order_channel === "own_delivery";

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] border-l-4 ${borderColors[order.status] || "border-l-gray-300"} flex flex-col h-full`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#1F2933]">
              {isTakeaway ? (order.table_number || "Barra") : `Mesa ${order.table_number}`}
            </h2>
            {isTakeaway && (
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Takeaway
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7280] mt-0.5">Pedido: #{generateShortOrderCode(order.id)}</p>
          {order.customer_name && (
            <p className="text-sm font-semibold text-[#1F2933] flex items-center gap-1 mt-1 bg-gray-50 px-2 py-0.5 rounded-md w-fit">
              <User size={13} className="text-[#E76F51]" /> {order.customer_name}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center text-[#6B7280]">
            <Clock size={16} className="mr-1" />
            <span className="text-sm font-medium">{getTimeAgo(order.created_at)}</span>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-6 flex-1 border-t border-gray-100 pt-3">
        {order.order_items?.filter(item => !stationId || item.station_id === stationId || item.station_id === null).map((item) => (
          <div key={item.id}>
            <p className="text-lg text-[#1F2933] font-medium leading-tight">
              <span className="font-bold text-[#E76F51] mr-2">{item.quantity}x</span> 
              {item.product_name}
            </p>
            {item.notes && (
              <div className="mt-1 bg-[#FEF3CD] text-[#92400E] px-2.5 py-1 rounded-lg text-xs font-medium inline-block">
                ⚠️ {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preparation Time Controls */}
      {order.status === "sent" || order.status === "received" ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-orange-950 uppercase tracking-wide flex items-center gap-1">
              <Clock size={14} className="text-[#E76F51]" /> Tiempo Estimado
            </span>
            <span className="text-xs text-orange-800">Sumador de 5 en 5</span>
          </div>

          {/* Stepper with 5 min increments */}
          <div className="flex items-center justify-between bg-white border border-orange-200 rounded-lg p-1.5 shadow-xs mb-2">
            <button
              type="button"
              onClick={() => setPrepMinutes((prev) => Math.max(5, prev - 5))}
              disabled={prepMinutes <= 5}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Minus size={15} /> 5m
            </button>
            <div className="text-center px-2">
              <span className="text-2xl font-black text-[#1F2933]">{prepMinutes}</span>
              <span className="text-xs text-gray-500 font-medium ml-1">min</span>
            </div>
            <button
              type="button"
              onClick={() => setPrepMinutes((prev) => Math.min(120, prev + 5))}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-sm transition-colors cursor-pointer"
            >
              <Plus size={15} /> 5m
            </button>
          </div>

          {/* Quick selection pills */}
          <div className="flex items-center justify-between gap-1 mb-3">
            {[10, 15, 20, 25, 30, 45].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setPrepMinutes(mins)}
                className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${
                  prepMinutes === mins
                    ? "bg-[#E76F51] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleStartPreparing}
            disabled={loading}
            className="w-full h-12 rounded-lg text-md font-bold transition-all bg-[#E76F51] text-white hover:bg-[#d65e40] flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <ChefHat size={18} />
            {loading ? "Iniciando..." : `Confirmar (${prepMinutes} min) e Iniciar`}
          </button>
        </div>
      ) : order.status === "preparing" ? (
        <div className="space-y-2 mb-3">
          {/* Active Prep Time Status & Extension */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isDelayed ? "bg-red-50 border-red-200 text-red-900" : "bg-emerald-50 border-emerald-200 text-emerald-950"
          }`}>
            <div className="flex items-center gap-2">
              {isDelayed ? <AlertCircle size={18} className="text-red-600 animate-pulse" /> : <Clock size={18} className="text-emerald-600" />}
              <div>
                <p className="text-sm font-bold">{remainingMinutesText}</p>
                {readyFormattedTime && (
                  <p className="text-xs text-gray-600">Listo aprox: {readyFormattedTime} (UTC-4)</p>
                )}
              </div>
            </div>
            <button
              onClick={handleAdd5Minutes}
              disabled={loading}
              title="Añadir 5 minutos por demora"
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs flex items-center gap-1"
            >
              <Plus size={13} /> 5 min
            </button>
          </div>

          {/* Mark Ready Button */}
          <button
            onClick={handleMarkReady}
            disabled={loading}
            className="w-full h-14 rounded-xl text-lg font-bold transition-colors bg-[#2E7D32] text-white hover:bg-[#256629] flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <CheckCircle size={20} />
            {loading ? "Actualizando..." : "Marcar como Listo"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleMarkReady}
          disabled={loading}
          className="w-full h-14 rounded-xl text-lg font-bold transition-colors bg-[#2E7D32] text-white hover:bg-[#256629] disabled:opacity-50"
        >
          {loading ? "Actualizando..." : actionLabel}
        </button>
      )}
    </div>
  );
}

