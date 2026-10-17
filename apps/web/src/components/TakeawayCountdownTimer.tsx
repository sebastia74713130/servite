"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, CheckCircle2, Sparkles, ChefHat, MapPin, Bike, ExternalLink, Navigation } from "lucide-react";

interface TakeawayCountdownTimerProps {
  order: {
    id: string;
    status: string;
    created_at?: string;
    estimated_prep_minutes?: number | null;
    estimated_ready_at?: string | null;
    fulfillment_type?: string | null;
    delivery_location_url?: string | null;
    delivery_instructions?: string | null;
    delivery_extra_minutes?: number | null;
  };
  variant?: "card" | "banner";
  restaurantMapsUrl?: string | null;
  onViewDetails?: () => void;
}

export function TakeawayCountdownTimer({
  order,
  variant = "card",
  restaurantMapsUrl,
  onViewDetails,
}: TakeawayCountdownTimerProps) {
  const [now, setNow] = useState<number>(Date.now());

  // Conteo regresivo actualizado cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isDelivery = order.fulfillment_type === "delivery";

  const {
    isReady,
    isPreparing,
    isPending,
    isDelivered,
    formattedTime,
    progressPercentage,
    isOvertime,
    overtimeSeconds,
    readyClockTime,
    totalMinutes,
  } = useMemo(() => {
    const status = order.status;
    const isReady = status === "ready";
    const isPreparing = status === "preparing";
    const isPending = status === "sent" || status === "received";
    const isDelivered = status === "delivered";

    const extraMinutes = isDelivery ? (order.delivery_extra_minutes || 10) : 0;
    const extraMs = extraMinutes * 60 * 1000;
    const basePrepMinutes = order.estimated_prep_minutes || 20;
    const totalMinutes = basePrepMinutes + extraMinutes; // Tiempo sumado total

    if (!order.estimated_ready_at || !isPreparing) {
      return {
        isReady,
        isPreparing,
        isPending,
        isDelivered,
        formattedTime: "",
        progressPercentage: isReady ? 100 : 0,
        isOvertime: false,
        overtimeSeconds: 0,
        readyClockTime: "",
        totalMinutes,
      };
    }

    // Tiempo sumado: readyMs incluye los 10 minutos de delivery
    const baseReadyMs = new Date(order.estimated_ready_at).getTime();
    const readyMs = baseReadyMs + extraMs;

    const createdMs = order.created_at
      ? new Date(order.created_at).getTime()
      : readyMs - totalMinutes * 60 * 1000;

    const diffMs = readyMs - now;
    const isOvertime = diffMs <= 0;
    const overtimeSeconds = isOvertime ? Math.floor(Math.abs(diffMs) / 1000) : 0;

    // Calcular porcentaje de progreso
    const totalDurationMs = Math.max(1, readyMs - createdMs);
    const elapsedMs = Math.max(0, now - createdMs);
    const progress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

    // Formatear minutos y segundos restantes (tiempo sumado)
    const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    // Hora estimada en formato local de Bolivia
    let clock = "";
    try {
      clock = new Intl.DateTimeFormat("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/La_Paz",
      }).format(new Date(readyMs));
    } catch {
      clock = "";
    }

    return {
      isReady,
      isPreparing,
      isPending,
      isDelivered,
      formattedTime: formatted,
      progressPercentage: progress,
      isOvertime,
      overtimeSeconds,
      readyClockTime: clock,
      totalMinutes,
    };
  }, [order.status, order.estimated_ready_at, order.created_at, order.estimated_prep_minutes, order.delivery_extra_minutes, isDelivery, now]);

  if (isDelivered) {
    return null;
  }

  // ==========================================
  // VARIANTE BANNER: Barra flotante en el menú
  // ==========================================
  if (variant === "banner") {
    if (isReady) {
      return (
        <div 
          onClick={onViewDetails}
          className="cursor-pointer bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300 border border-emerald-500/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl animate-bounce shrink-0">{isDelivery ? "🛵" : "🎉"}</span>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-wide leading-tight truncate">
                {isDelivery ? "¡Pedido listo! En camino a tu domicilio" : "¡Tu pedido está listo!"}
              </p>
              <p className="text-[11px] text-emerald-100 truncate">
                {isDelivery ? "El repartidor va hacia tu ubicación" : "Acércate a la barra a recogerlo"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="px-3 py-1.5 bg-white text-emerald-800 text-xs font-black rounded-xl shrink-0 shadow-sm hover:bg-emerald-50 active:scale-95 transition-transform"
          >
            Ver
          </button>
        </div>
      );
    }

    if (isPreparing) {
      return (
        <div 
          onClick={onViewDetails}
          className="cursor-pointer bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl flex flex-col gap-2 animate-in slide-in-from-bottom duration-300 border border-white/10"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                {isDelivery ? (
                  <Bike size={16} className="text-purple-400" />
                ) : (
                  <Clock size={16} className="animate-spin text-purple-400" style={{ animationDuration: '6s' }} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-200 flex items-center gap-1.5 truncate">
                  <span>{isDelivery ? "Preparando y enviando pedido" : "Preparando tu pedido"}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping inline-block" />
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {isOvertime 
                    ? (isDelivery ? "Toques finales a la entrega" : "Toques finales en cocina")
                    : readyClockTime 
                    ? (isDelivery ? `Entrega aprox: ${readyClockTime}` : `Listo aprox: ${readyClockTime}`)
                    : "En preparación"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-mono text-sm font-black px-2.5 py-1 rounded-lg ${
                isOvertime ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              }`}>
                {isOvertime 
                  ? `+${Math.floor(overtimeSeconds / 60)}:${String(overtimeSeconds % 60).padStart(2, "0")}` 
                  : formattedTime}
              </span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 rounded-full ${
                isOvertime ? "bg-amber-400" : "bg-gradient-to-r from-purple-500 to-indigo-400"
              }`}
              style={{ width: `${isOvertime ? 100 : progressPercentage}%` }}
            />
          </div>
        </div>
      );
    }

    if (isPending) {
      return (
        <div 
          onClick={onViewDetails}
          className="cursor-pointer bg-blue-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300 border border-blue-500/20"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ChefHat size={16} className="text-blue-300 shrink-0 animate-pulse" />
            <p className="text-xs font-semibold text-blue-100 truncate">
              {isDelivery ? "Pedido recibido • Asignando tiempo de entrega..." : "Pedido recibido en cocina • Asignando tiempo..."}
            </p>
          </div>
          <span className="text-[10px] font-bold bg-blue-700/60 px-2 py-0.5 rounded-full text-blue-200">
            En espera
          </span>
        </div>
      );
    }

    return null;
  }

  // ==========================================
  // VARIANTE CARD: Tarjeta dentro de Mi Cuenta
  // ==========================================
  if (isReady) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-emerald-950 shadow-sm space-y-3 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-3xl animate-bounce">{isDelivery ? "🛵" : "🎉"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wide">
                {isDelivery ? "En camino a entrega" : "Listo para retirar"}
              </span>
            </div>
            <p className="text-base font-black text-emerald-900 leading-tight mt-0.5">
              {isDelivery ? "¡Tu pedido va en camino!" : "¡Tu pedido está listo!"}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {isDelivery 
                ? "El repartidor está trasladándose a tu ubicación." 
                : "Por favor acércate a la barra para recoger tu orden."}
            </p>
          </div>
        </div>

        {/* Si es Pick Up: Enlace con ubicación del restaurante */}
        {!isDelivery && restaurantMapsUrl && (
          <a
            href={restaurantMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-200 text-emerald-900 hover:bg-emerald-100/50 transition-colors shadow-2xs font-semibold text-xs"
          >
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-700 shrink-0" />
              <span>Ver ubicación del restaurante en Google Maps</span>
            </div>
            <ExternalLink size={14} className="text-emerald-600 shrink-0" />
          </a>
        )}

        {/* Si es Delivery: Resumen de destino */}
        {isDelivery && order.delivery_location_url && (
          <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-700" /> Destino de entrega:
              </span>
              <a
                href={order.delivery_location_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-700 underline flex items-center gap-1"
              >
                <span>Ver mapa</span>
                <ExternalLink size={12} />
              </a>
            </div>
            {order.delivery_instructions && (
              <p className="text-emerald-800 text-[11px] pt-1 border-t border-emerald-100">
                <span className="font-semibold">Indicaciones:</span> {order.delivery_instructions}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isPreparing) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border border-purple-200 rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Cabecera del temporizador */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              {isDelivery ? (
                <Bike size={20} className="text-purple-700" />
              ) : (
                <Clock size={20} className="animate-spin text-purple-700" style={{ animationDuration: '8s' }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-purple-950 uppercase tracking-wide">
                  {isDelivery ? "Tiempo de Entrega" : "Tiempo de Espera"}
                </span>
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
              </div>
              <p className="text-[11px] text-purple-800 font-medium">
                {isOvertime 
                  ? (isDelivery ? "Dando los toques finales a la entrega" : "Dando los toques finales al pedido")
                  : readyClockTime 
                  ? (isDelivery ? `Entrega estimada: ${readyClockTime}` : `Listo aprox: ${readyClockTime}`)
                  : "Preparando en cocina"}
              </p>
            </div>
          </div>

          {/* Contador digital principal mostrando el tiempo sumado */}
          <div className="text-right shrink-0">
            <div className={`px-3 py-1 rounded-xl font-mono text-xl font-black shadow-2xs ${
              isOvertime 
                ? "bg-amber-100 text-amber-900 border border-amber-300" 
                : "bg-purple-900 text-purple-50"
            }`}>
              {isOvertime 
                ? `+${Math.floor(overtimeSeconds / 60)}:${String(overtimeSeconds % 60).padStart(2, "0")}` 
                : formattedTime}
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              {isOvertime ? "tiempo extra" : "restantes"}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                isOvertime ? "bg-amber-500" : "bg-gradient-to-r from-purple-600 to-indigo-600"
              }`}
              style={{ width: `${isOvertime ? 100 : progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium px-0.5">
            <span>En preparación</span>
            <span>{isOvertime ? "100%" : `${progressPercentage}%`}</span>
            <span>{isDelivery ? "Entregado" : "Listo para entrega"}</span>
          </div>
        </div>

        {/* Ubicación del restaurante para Pick Up */}
        {!isDelivery && restaurantMapsUrl && (
          <a
            href={restaurantMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-purple-200 text-purple-950 hover:bg-purple-50/70 transition-colors shadow-2xs font-semibold text-xs"
          >
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-purple-700 shrink-0" />
              <span>Ver ubicación del restaurante en Maps</span>
            </div>
            <ExternalLink size={13} className="text-purple-600 shrink-0" />
          </a>
        )}

        {/* Destino de entrega para Delivery */}
        {isDelivery && order.delivery_location_url && (
          <div className="p-2.5 bg-purple-100/60 rounded-xl border border-purple-200 text-xs text-purple-950 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <MapPin size={14} className="text-purple-700" /> Destino de entrega:
              </span>
              <a
                href={order.delivery_location_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-purple-700 underline flex items-center gap-1"
              >
                <span>Ver mapa</span>
                <ExternalLink size={12} />
              </a>
            </div>
            {order.delivery_instructions && (
              <p className="text-purple-800 text-[11px] pt-1 border-t border-purple-200/50">
                <span className="font-semibold">Indicaciones:</span> {order.delivery_instructions}
              </p>
            )}
          </div>
        )}

        {/* Mensaje contextual */}
        <div className="flex items-center gap-2 pt-1 border-t border-purple-100/70 text-xs text-purple-900 font-medium">
          <Sparkles size={14} className="text-purple-600 shrink-0" />
          <span>
            {isDelivery 
              ? "Te avisaremos en cuanto el repartidor esté por llegar a tu domicilio."
              : "Te notificaremos en cuanto tu orden esté lista para recoger."}
          </span>
        </div>
      </div>
    );
  }

  // Estado pendiente (enviado / recibido pero cocina no inició el timer aún)
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-2.5 text-blue-950">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <ChefHat size={18} className="animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-bold text-blue-900 leading-tight">
            Orden recibida en cocina
          </p>
          <p className="text-[11px] text-blue-700 mt-0.5">
            {isDelivery 
              ? "Cocina asignará el tiempo estimado de preparación y entrega en breve."
              : "El equipo de cocina asignará el tiempo estimado de preparación en breve."}
          </p>
        </div>
      </div>

      {/* Si es Pick Up: Enlace con ubicación del restaurante */}
      {!isDelivery && restaurantMapsUrl && (
        <a
          href={restaurantMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-blue-200 text-blue-900 hover:bg-blue-50 transition-colors font-semibold text-xs"
        >
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-700 shrink-0" />
            <span>Ver ubicación del restaurante en Maps</span>
          </div>
          <ExternalLink size={13} className="text-blue-600 shrink-0" />
        </a>
      )}
    </div>
  );
}
