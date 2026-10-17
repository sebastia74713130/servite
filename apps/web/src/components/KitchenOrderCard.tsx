"use client";

import React, { useState, useEffect } from "react";
import ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { Order } from "@shared/types";
import { generateShortOrderCode, getTimeAgo } from "@shared/utils";
import { NEXT_STATUS, NEXT_STATUS_ACTION_LABEL } from "@shared/constants";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { Clock, Printer, Minus, Plus, ChefHat, User, CheckCircle, AlertCircle, Bike, MapPin, ExternalLink } from "lucide-react";

interface KitchenOrderCardProps {
  order: Order;
  stationId?: string;
  onOrderUpdated?: () => void;
}

export function KitchenOrderCard({ order, stationId, onOrderUpdated }: KitchenOrderCardProps) {
  const { updateStatus, loading } = useUpdateOrderStatus();
  const [currentStatus, setCurrentStatus] = useState<string>(order.status);
  
  // Sincronizar estado local si cambia la orden por realtime
  useEffect(() => {
    setCurrentStatus(order.status);
  }, [order.status]);

  const nextStatus = NEXT_STATUS[currentStatus];
  const actionLabel = NEXT_STATUS_ACTION_LABEL[currentStatus];

  // Estado para tiempo estimado de preparación (solo para Takeaway)
  const [prepMinutes, setPrepMinutes] = useState<number>(order.estimated_prep_minutes || 20);
  const [now, setNow] = useState(Date.now());

  // Actualizar conteo regresivo cada 30 segundos
  useEffect(() => {
    if (currentStatus === "preparing") {
      const interval = setInterval(() => setNow(Date.now()), 30000);
      return () => clearInterval(interval);
    }
  }, [currentStatus]);

  // Detección estricta de Takeaway vs Dine-in
  const isTakeaway = Boolean(
    order.order_channel === "own_delivery" || 
    (order.order_channel as string) === "takeaway" || 
    (order as any).type === "takeaway" || 
    (order as any).tables?.type === "takeaway" || 
    order.table_number?.toUpperCase().startsWith("BARRA") ||
    order.table_number?.toUpperCase().includes("TAKEAWAY")
  );

  // Iniciar preparación para Dine-in (Sin selector de tiempo, directo a preparing)
  const handleStartPreparingDineIn = async () => {
    setCurrentStatus("preparing");
    const success = await updateStatus(order.id, "preparing", order.restaurant_id);
    if (success) {
      onOrderUpdated?.();
    } else {
      setCurrentStatus(order.status);
      alert("Error al iniciar preparación del pedido en cocina.");
    }
  };

  // Iniciar preparación para Takeaway (Guarda tiempo estimado y fecha de entrega)
  const handleStartPreparingTakeaway = async () => {
    const minutes = prepMinutes > 0 ? prepMinutes : 15;
    const estimatedReadyAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    setCurrentStatus("preparing");
    const success = await updateStatus(order.id, "preparing", order.restaurant_id, {
      estimated_prep_minutes: minutes,
      estimated_ready_at: estimatedReadyAt,
    });
    if (success) {
      onOrderUpdated?.();
    } else {
      setCurrentStatus(order.status);
      alert("Error al iniciar preparación del pedido en cocina.");
    }
  };

  // Añadir 5 minutos por demora en Takeaway
  const handleAdd5Minutes = async () => {
    const baseTime = order.estimated_ready_at ? new Date(order.estimated_ready_at).getTime() : Date.now();
    const newReadyAt = new Date(Math.max(baseTime, Date.now()) + 5 * 60 * 1000).toISOString();
    const newMinutes = (order.estimated_prep_minutes || 0) + 5;
    setPrepMinutes(newMinutes);
    const success = await updateStatus(order.id, "preparing", order.restaurant_id, {
      estimated_prep_minutes: newMinutes,
      estimated_ready_at: newReadyAt,
    });
    if (success) {
      onOrderUpdated?.();
    }
  };

  // Marcar como listo (ready)
  const handleMarkReady = async () => {
    setCurrentStatus("ready");
    const success = await updateStatus(order.id, "ready", order.restaurant_id);
    if (success) {
      onOrderUpdated?.();
    } else {
      setCurrentStatus(order.status);
      alert("Error al marcar pedido como listo.");
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

    const isDelivery = order.fulfillment_type === "delivery";
    let qrSvgString = "";
    if (isDelivery && order.delivery_location_url) {
      try {
        qrSvgString = ReactDOMServer.renderToString(
          React.createElement(QRCodeSVG, {
            value: order.delivery_location_url,
            size: 135,
            level: "M",
          })
        );
      } catch (e) {
        console.error("Error generating QR for delivery print:", e);
      }
    }

    const html = `
      <html>
        <head>
          <title>Pedido ${generateShortOrderCode(order.id)}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            h2 { font-size: 18px; margin-top: 0; color: #555; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; margin-bottom: 8px; }
            .badge-delivery { background: #000; color: #fff; }
            .badge-takeaway { background: #e0e0e0; color: #000; }
            .items { margin-top: 20px; }
            .delivery-box { margin-top: 15px; border: 1px dashed #000; padding: 10px; border-radius: 6px; text-align: center; }
            .footer { margin-top: 30px; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div>
            ${isDelivery 
              ? `<div class="badge badge-delivery">🛵 PEDIDO DELIVERY</div>`
              : isTakeaway
              ? `<div class="badge badge-takeaway">🛍️ PARA LLEVAR (PICK UP)</div>`
              : ""
            }
          </div>
          <h1>${isDelivery ? "DELIVERY A DOMICILIO" : isTakeaway ? (order.table_number || "BARRA / PARA LLEVAR") : `MESA ${order.table_number}`}</h1>
          ${order.customer_name ? `<h3>Cliente: ${order.customer_name}</h3>` : ""}
          <h2>Pedido #${generateShortOrderCode(order.id)}</h2>

          ${isDelivery && order.delivery_instructions ? `
            <div style="margin: 10px 0; padding: 8px; background: #f0f0f0; border-left: 3px solid #000; font-size: 13px;">
              <strong>Indicaciones de Entrega:</strong><br/>
              ${order.delivery_instructions}
            </div>
          ` : ""}

          ${qrSvgString ? `
            <div class="delivery-box">
              <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">UBICACIÓN GOOGLE MAPS DEL CLIENTE:</div>
              <div style="display: flex; justify-content: center; align-items: center; margin: 0 auto;">
                ${qrSvgString}
              </div>
              <div style="font-size: 10px; margin-top: 6px; word-break: break-all;">${order.delivery_location_url}</div>
            </div>
          ` : ""}

          <div class="items">
            ${itemsHtml}
          </div>
          <div class="footer">
            Fecha: ${new Date(order.created_at).toLocaleString("es-BO")}
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

  // Si no hay próximo estado o ya fue marcado como listo, se oculta de la pantalla de cocina
  if (!nextStatus || currentStatus === "ready") return null;

  // Cálculo de tiempo restante solo si la orden es Takeaway y está en preparación
  let remainingMinutesText = "";
  let readyFormattedTime = "";
  let isDelayed = false;

  if (isTakeaway && currentStatus === "preparing" && order.estimated_ready_at) {
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

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] border-l-4 ${borderColors[currentStatus] || "border-l-gray-300"} flex flex-col h-full transition-all`}>
      {/* Cabecera de la tarjeta */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 mr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-[#1F2933]">
              {order.fulfillment_type === "delivery"
                ? "Delivery"
                : isTakeaway
                ? (order.table_number || "Barra")
                : `Mesa ${order.table_number}`}
            </h2>
            {order.fulfillment_type === "delivery" ? (
              <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                <Bike size={13} className="text-amber-700" /> Delivery
              </span>
            ) : isTakeaway ? (
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Para Llevar
              </span>
            ) : (
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                Mesa
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7280] mt-0.5">Pedido: #{generateShortOrderCode(order.id)}</p>
          {order.customer_name && (
            <p className="text-sm font-semibold text-[#1F2933] flex items-center gap-1 mt-1 bg-gray-50 px-2 py-0.5 rounded-md w-fit">
              <User size={13} className="text-[#E76F51]" /> {order.customer_name}
            </p>
          )}

          {/* Detalles de Delivery (Ubicación e Indicaciones) */}
          {order.fulfillment_type === "delivery" && (
            <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-amber-950 flex items-center gap-1">
                  <MapPin size={13} className="text-amber-700 shrink-0" /> Ubicación Delivery
                </span>
                {order.delivery_location_url && (
                  <a
                    href={order.delivery_location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded-md transition-colors"
                  >
                    <ExternalLink size={11} /> Abrir Maps
                  </a>
                )}
              </div>
              {order.delivery_instructions && (
                <p className="text-gray-700 italic bg-white/80 p-1.5 rounded-lg border border-amber-100 leading-tight">
                  "{order.delivery_instructions}"
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center text-[#6B7280]">
            <Clock size={16} className="mr-1" />
            <span className="text-sm font-medium">{getTimeAgo(order.created_at)}</span>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Ítems del pedido */}
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

      {/* ACCIONES Y BOTONES DEL FLUJO DE COCINA */}
      {currentStatus === "sent" || currentStatus === "received" ? (
        isTakeaway ? (
          /* CASO 1: TAKEAWAY EN PENDIENTE -> Requiere configuración de tiempo estimado */
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={14} className="text-purple-700" /> Tiempo Estimado
              </span>
              <span className="text-xs text-purple-700 font-medium">Para Llevar</span>
            </div>

            {/* Stepper de 5 en 5 */}
            <div className="flex items-center justify-between bg-white border border-purple-200 rounded-lg p-1.5 shadow-2xs">
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
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-sm transition-colors cursor-pointer"
              >
                <Plus size={15} /> 5m
              </button>
            </div>

            {/* Píldoras de selección rápida */}
            <div className="flex items-center justify-between gap-1">
              {[10, 15, 20, 25, 30, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setPrepMinutes(mins)}
                  className={`flex-1 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                    prepMinutes === mins
                      ? "bg-purple-700 text-white"
                      : "bg-white text-gray-700 border border-purple-200 hover:bg-purple-100/50"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Botón de confirmación e inicio */}
            <button
              onClick={handleStartPreparingTakeaway}
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-bold transition-all bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <ChefHat size={18} />
              {loading ? "Iniciando..." : `Confirmar (${prepMinutes} min) e Iniciar`}
            </button>
          </div>
        ) : (
          /* CASO 2: DINE-IN (MESA) EN PENDIENTE -> Un solo clic, sin tiempo estimado */
          <div>
            <button
              onClick={handleStartPreparingDineIn}
              disabled={loading}
              className="w-full h-14 rounded-xl text-md font-bold transition-all bg-[#E76F51] hover:bg-[#d65e40] text-white flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <ChefHat size={20} />
              {loading ? "Iniciando..." : "Empezar a Preparar"}
            </button>
          </div>
        )
      ) : currentStatus === "preparing" ? (
        /* CASO 3: EN PREPARACIÓN -> Listo para servir/retirar */
        <div className="space-y-2.5">
          {isTakeaway && (
            /* Badge de tiempo y extensión para Takeaway */
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isDelayed ? "bg-red-50 border-red-200 text-red-900" : "bg-purple-50 border-purple-200 text-purple-950"
            }`}>
              <div className="flex items-center gap-2">
                {isDelayed ? (
                  <AlertCircle size={18} className="text-red-600 animate-pulse shrink-0" />
                ) : (
                  <Clock size={18} className="text-purple-600 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-bold leading-tight">{remainingMinutesText}</p>
                  {readyFormattedTime && (
                    <p className="text-xs text-gray-600">Listo aprox: {readyFormattedTime} (UTC-4)</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleAdd5Minutes}
                disabled={loading}
                title="Añadir 5 minutos por demora"
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus size={13} /> 5 min
              </button>
            </div>
          )}

          {/* Botón de marcar como listo */}
          <button
            onClick={handleMarkReady}
            disabled={loading}
            className="w-full h-14 rounded-xl text-lg font-bold transition-colors bg-[#2E7D32] hover:bg-[#256629] text-white flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle size={20} />
            {loading ? "Actualizando..." : (order.fulfillment_type === "delivery" ? "Listo para Despachar" : isTakeaway ? "Listo para Retirar" : "Listo para Servir")}
          </button>
        </div>
      ) : (
        /* CASO 4: Fallback genérico */
        <button
          onClick={handleMarkReady}
          disabled={loading}
          className="w-full h-14 rounded-xl text-lg font-bold transition-colors bg-[#2E7D32] hover:bg-[#256629] text-white disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Actualizando..." : actionLabel}
        </button>
      )}
    </div>
  );
}
