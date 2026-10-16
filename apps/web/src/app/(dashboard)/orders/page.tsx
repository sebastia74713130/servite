"use client";

import { useState, useEffect, useMemo } from "react";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { useOrders } from "@/hooks/useOrders";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { supabase } from "@/lib/supabase";
import { Order, RestaurantTable } from "@shared/types";
import { generateShortOrderCode, getTimeAgo } from "@shared/utils";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { TableQrModal } from "@/components/TableQrModal";
import {
  QrCode,
  Search,
  Clock,
  User,
  ShoppingBag,
  CheckCircle,
  FileText,
  Printer,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ChefHat,
  ArrowRight
} from "lucide-react";

// Module-level cache for takeaway table lookup
let cachedOrdersTables: RestaurantTable[] | null = null;

export default function OrdersPage() {
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const { orders, loading: ordersLoading, refreshOrders } = useOrders(restaurant?.id, branch?.id);
  const { updateStatus, loading: updatingStatus } = useUpdateOrderStatus();

  const [tables, setTables] = useState<RestaurantTable[]>(cachedOrdersTables || []);
  const [takeawayTable, setTakeawayTable] = useState<RestaurantTable | null>(
    cachedOrdersTables?.find((t) => t.type === "takeaway") || null
  );
  const [showQrModal, setShowQrModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "received" | "preparing" | "ready" | "delivered">("all");
  const [creatingTakeawayTable, setCreatingTakeawayTable] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  // Fetch tables to identify takeaway tables
  const fetchTables = async () => {
    if (!restaurant?.id) return;
    try {
      let query = supabase
        .from("tables")
        .select("*")
        .eq("restaurant_id", restaurant.id);
      if (branch?.id) query = query.eq("branch_id", branch.id);

      const { data, error } = await query;
      if (!error && data) {
        cachedOrdersTables = data as RestaurantTable[];
        setTables(cachedOrdersTables);
        const found = cachedOrdersTables.find((t) => t.type === "takeaway");
        if (found) {
          setTakeawayTable(found as RestaurantTable);
        }
      }
    } catch (e) {
      console.error("Error fetching tables in orders page:", e);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [restaurant?.id, branch?.id]);

  // Set of IDs of tables that are takeaway
  const takeawayTableIds = useMemo(() => {
    return new Set(tables.filter((t) => t.type === "takeaway").map((t) => t.id));
  }, [tables]);

  // Filter orders that belong to Takeaway / Barra
  const takeawayOrders = useMemo(() => {
    return orders.filter((o) => {
      const isChannelTakeaway = o.order_channel === "own_delivery";
      const isTableTakeaway = o.table_id ? takeawayTableIds.has(o.table_id) : false;
      const isNameTakeaway = o.table_number?.toUpperCase().startsWith("BARRA");
      return isChannelTakeaway || isTableTakeaway || isNameTakeaway;
    });
  }, [orders, takeawayTableIds]);

  // Counts for each tab
  const counts = useMemo(() => {
    const all = takeawayOrders.length;
    const received = takeawayOrders.filter((o) => o.status === "sent" || o.status === "received").length;
    const preparing = takeawayOrders.filter((o) => o.status === "preparing").length;
    const ready = takeawayOrders.filter((o) => o.status === "ready").length;
    const delivered = takeawayOrders.filter((o) => o.status === "delivered").length;
    return { all, received, preparing, ready, delivered };
  }, [takeawayOrders]);

  // Filtered orders by tab and search
  const filteredOrders = useMemo(() => {
    return takeawayOrders.filter((o) => {
      // Tab filter
      if (activeTab === "received" && o.status !== "sent" && o.status !== "received") return false;
      if (activeTab === "preparing" && o.status !== "preparing") return false;
      if (activeTab === "ready" && o.status !== "ready") return false;
      if (activeTab === "delivered" && o.status !== "delivered") return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const shortCode = generateShortOrderCode(o.id).toLowerCase();
        const clientName = (o.customer_name || "").toLowerCase();
        const clientNit = (o.customer_nit || "").toLowerCase();
        const tableNum = (o.table_number || "").toLowerCase();
        const matchesItem = o.order_items?.some((i) => i.product_name.toLowerCase().includes(query));

        return (
          shortCode.includes(query) ||
          clientName.includes(query) ||
          clientNit.includes(query) ||
          tableNum.includes(query) ||
          matchesItem
        );
      }

      return true;
    });
  }, [takeawayOrders, activeTab, searchQuery]);

  // Handle opening Takeaway QR modal (auto-provisioning if doesn't exist yet)
  const handleOpenTakeawayQr = async () => {
    if (takeawayTable) {
      setShowQrModal(true);
      return;
    }

    if (!restaurant?.id) return;
    setCreatingTakeawayTable(true);
    try {
      const { data: newTable, error } = await supabase
        .from("tables")
        .insert({
          restaurant_id: restaurant.id,
          branch_id: branch?.id || null,
          table_number: "1",
          table_code: "BARRA-1",
          type: "takeaway",
          is_active: true,
        })
        .select()
        .single();

      if (!error && newTable) {
        setTakeawayTable(newTable as RestaurantTable);
        setTables((prev) => [...prev, newTable as RestaurantTable]);
        setShowQrModal(true);
      } else {
        alert("Error al inicializar la barra de takeaway: " + (error?.message || ""));
      }
    } catch (e: any) {
      alert("Error al crear mesa takeaway: " + e.message);
    } finally {
      setCreatingTakeawayTable(false);
    }
  };

  // Status transitions
  const handleAdvanceStatus = async (order: Order, nextStatus: string) => {
    setActionOrderId(order.id);
    await updateStatus(order.id, nextStatus, order.restaurant_id);
    if (refreshOrders) {
      await refreshOrders();
    }
    setActionOrderId(null);
  };

  // Format Bolivia UTC-4 estimated time
  const formatReadyTime = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      return new Intl.DateTimeFormat("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/La_Paz",
      }).format(new Date(isoString));
    } catch {
      return "";
    }
  };

  if (sessionLoading || (ordersLoading && orders.length === 0)) {
    return <LoadingState />;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#1F2933]">Pedidos</h1>
            <div className="flex items-center space-x-1.5 text-[#2E7D32] bg-[#EDF7ED] px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
              <span>Tiempo real</span>
            </div>
          </div>
          <p className="text-gray-500 mt-1">
            Gestión en tiempo real de órdenes para llevar, mostrador y barra.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshOrders && refreshOrders()}
            title="Refrescar pedidos"
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={18} />
          </button>

          {/* QR Takeaway Button */}
          <button
            onClick={handleOpenTakeawayQr}
            disabled={creatingTakeawayTable}
            className="flex items-center gap-2 bg-[#E76F51] hover:bg-[#d65e40] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm cursor-pointer disabled:opacity-50"
          >
            <QrCode size={18} />
            <span>{creatingTakeawayTable ? "Generando..." : "QR Takeaway"}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "all"
                ? "bg-[#1F2933] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <span>Todos</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("received")}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "received"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <span>Recibidos</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === "received" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
              }`}
            >
              {counts.received}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("preparing")}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "preparing"
                ? "bg-amber-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <span>En preparación</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === "preparing" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"
              }`}
            >
              {counts.preparing}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ready")}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "ready"
                ? "bg-[#2E7D32] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <span>Listos para recoger</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === "ready" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {counts.ready}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("delivered")}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "delivered"
                ? "bg-gray-700 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <span>Entregados</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === "delivered" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {counts.delivered}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente, plato o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
          />
        </div>
      </div>

      {/* Orders Grid / List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl flex items-center justify-center py-20 mt-4 shadow-xs">
          <EmptyState
            icon={ShoppingBag}
            title={
              searchQuery
                ? "Sin resultados para tu búsqueda"
                : activeTab === "all"
                ? "No hay pedidos para llevar hoy"
                : "No hay pedidos en este estado"
            }
            subtitle={
              searchQuery
                ? "Intenta con otro nombre, número de orden o plato."
                : "Los pedidos de barra y takeaway aparecerán automáticamente aquí cuando los comensales escaneen el QR."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const shortCode = generateShortOrderCode(order.id);
            const isSent = order.status === "sent";
            const isReceived = order.status === "received";
            const isPreparing = order.status === "preparing";
            const isReady = order.status === "ready";
            const isDelivered = order.status === "delivered";

            const readyAtFormatted = formatReadyTime(order.estimated_ready_at);
            const isActing = actionOrderId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-5 shadow-xs border transition-all flex flex-col justify-between ${
                  isReady
                    ? "border-emerald-300 ring-2 ring-emerald-100"
                    : isPreparing
                    ? "border-amber-300"
                    : "border-gray-200"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-[#1F2933] font-mono">
                          #{shortCode}
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                          {order.table_number || "Barra"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Clock size={13} />
                        <span>{getTimeAgo(order.created_at)}</span>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isSent && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                          Nuevo
                        </span>
                      )}
                      {isReceived && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Recibido
                        </span>
                      )}
                      {isPreparing && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <ChefHat size={13} className="text-amber-600" /> En cocina
                        </span>
                      )}
                      {isReady && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse flex items-center gap-1">
                          <CheckCircle size={13} /> ¡Listo para entrega!
                        </span>
                      )}
                      {isDelivered && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">
                          Entregado
                        </span>
                      )}

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          order.is_paid
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {order.is_paid ? "Pagado" : "Pendiente de pago"}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="mb-3.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-[#1F2933]">
                      <User size={15} className="text-[#E76F51] flex-shrink-0" />
                      <span className="font-bold">
                        {order.customer_name || "Cliente mostrador"}
                      </span>
                    </div>
                    {order.customer_nit && (
                      <div className="text-xs text-gray-500 mt-1 pl-6">
                        NIT/CI: <span className="font-mono font-medium">{order.customer_nit}</span>
                      </div>
                    )}
                  </div>

                  {/* Estimated Time Callout */}
                  {isPreparing && (
                    <div className="mb-3.5 bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-700" />
                        <div>
                          <p className="text-xs font-bold text-amber-950">
                            Tiempo estimado: ~{order.estimated_prep_minutes || 20} min
                          </p>
                          {readyAtFormatted && (
                            <p className="text-[11px] text-amber-800">
                              Listo aprox: {readyAtFormatted} (UTC-4)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {isReady && (
                    <div className="mb-3.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-950">
                      <span className="text-xl">🛍️</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Listo para retirar en barra</p>
                        <p className="text-[11px] text-emerald-700">Llamar a {order.customer_name || "Cliente"}</p>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-2 mb-4">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="text-gray-800">
                          <span className="font-bold text-[#E76F51] mr-1.5">{item.quantity}x</span>
                          <span>{item.product_name}</span>
                          {item.notes && (
                            <p className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                              Nota: {item.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 ml-2 whitespace-nowrap">
                          Bs {Number(item.total_price || 0).toLocaleString("es-BO")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-500 font-bold uppercase">Total del pedido</span>
                    <span className="text-lg font-black text-[#1F2933]">
                      Bs {Number(order.total || 0).toLocaleString("es-BO")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Primary Action Button */}
                    {isSent || isReceived ? (
                      <button
                        onClick={() => handleAdvanceStatus(order, "preparing")}
                        disabled={isActing}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <ChefHat size={16} />
                        <span>{isActing ? "Actualizando..." : "Pasar a Preparación"}</span>
                      </button>
                    ) : isPreparing ? (
                      <button
                        onClick={() => handleAdvanceStatus(order, "ready")}
                        disabled={isActing}
                        className="w-full py-2.5 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        <span>{isActing ? "Actualizando..." : "Marcar Listo para Recoger"}</span>
                      </button>
                    ) : isReady ? (
                      <button
                        onClick={() => handleAdvanceStatus(order, "delivered")}
                        disabled={isActing}
                        className="w-full py-2.5 bg-[#1F2933] hover:bg-black text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        <span>{isActing ? "Actualizando..." : "Entregar al Cliente"}</span>
                      </button>
                    ) : null}

                    {/* Receipt print button */}
                    <button
                      onClick={() => window.open(`/api/receipt/print?orderId=${order.id}`, "_blank")}
                      className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-gray-200 cursor-pointer"
                    >
                      <Printer size={14} />
                      <span>Ver Comprobante de Venta</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Takeaway QR Modal */}
      {takeawayTable && (
        <TableQrModal
          table={takeawayTable}
          restaurant={restaurant}
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}
