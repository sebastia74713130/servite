"use client";

import { useState, useEffect, useTransition } from "react";
import { getAdminRestaurants, updateRestaurantSubscription } from "../actions";
import { RestaurantManagerModal } from "../restaurants/RestaurantManagerModal";
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Plus, 
  Search,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Receipt
} from "lucide-react";

export default function AdminSubscriptionsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "soon" | "expired" | "active">("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminRestaurants();
      setRestaurants(data);
    } catch (err) {
      console.error("Error loading subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const totalMrr = restaurants.reduce((sum, r) => {
    if (r.subscription_status === "active") return sum + Number(r.monthly_price || 0);
    return sum;
  }, 0);

  const soonCount = restaurants.filter(r => {
    if (r.subscription_status !== "active" || !r.subscription_expires_at) return false;
    const exp = new Date(r.subscription_expires_at);
    return exp >= now && exp <= in7Days;
  }).length;

  const expiredCount = restaurants.filter(r => 
    r.subscription_status === "expired" || 
    (r.subscription_expires_at && new Date(r.subscription_expires_at) < now)
  ).length;

  // Extend 30 days quick action
  const handleExtendMonth = (rest: any) => {
    const baseDate = rest.subscription_expires_at ? new Date(rest.subscription_expires_at) : new Date();
    const start = baseDate < new Date() ? new Date() : baseDate;
    const newExp = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const formattedDate = newExp.toLocaleDateString("es-BO");
    if (!window.confirm(`¿Extender suscripción de "${rest.name}" por 1 mes (hasta el ${formattedDate}) y marcar como ACTIVO?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await updateRestaurantSubscription(rest.id, {
          status: "active",
          expires_at: newExp.toISOString()
        });
        await loadData();
      } catch (err: any) {
        alert(err.message || "Error al extender suscripción");
      }
    });
  };

  // Filtered list
  const filtered = restaurants.filter(r => {
    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      const match = r.name?.toLowerCase().includes(s) || 
                    r.slug?.toLowerCase().includes(s) || 
                    r.owner_email?.toLowerCase().includes(s);
      if (!match) return false;
    }

    if (filter === "soon") {
      if (r.subscription_status !== "active" || !r.subscription_expires_at) return false;
      const exp = new Date(r.subscription_expires_at);
      return exp >= now && exp <= in7Days;
    }

    if (filter === "expired") {
      return r.subscription_status === "expired" || 
             (r.subscription_expires_at && new Date(r.subscription_expires_at) < now);
    }

    if (filter === "active") {
      return r.subscription_status === "active";
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Gestión de Suscripciones & Cobranzas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervisa los vencimientos, el flujo de ingresos recurrentes (MRR) y renueva planes rápidamente.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              MRR Mensual Activo
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              Bs. {totalMrr.toLocaleString("es-BO")}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Por Vencer (&lt;7 días)
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {soonCount} restaurantes
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vencidos / Morosos
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {expiredCount} restaurantes
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todos ({restaurants.length})
          </button>
          <button
            onClick={() => setFilter("soon")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === "soon" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Por vencer ({soonCount})
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === "expired" ? "bg-red-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Vencidos ({expiredCount})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === "active" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Activos
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por restaurante o correo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Restaurante</th>
                <th className="py-3.5 px-4">Precio & Frecuencia</th>
                <th className="py-3.5 px-4">Vencimiento</th>
                <th className="py-3.5 px-4">Notas de Cobranza</th>
                <th className="py-3.5 px-4 text-right">Renovación Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Cargando suscripciones...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No se encontraron suscripciones con este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((rest) => {
                  const exp = rest.subscription_expires_at ? new Date(rest.subscription_expires_at) : null;
                  const diffDays = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const isExp = diffDays !== null && diffDays < 0;
                  const isSoon = diffDays !== null && diffDays >= 0 && diffDays <= 7;

                  return (
                    <tr key={rest.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Plan */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rest.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">/{rest.slug}</span>
                          <span>•</span>
                          <span className="text-slate-400">{rest.owner_email}</span>
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          Bs. {Number(rest.monthly_price || 0).toLocaleString("es-BO")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {rest.billing_period === "annual" ? "Facturación anual" : rest.billing_period === "semiannual" ? "Facturación semestral" : "Facturación mensual"}
                        </div>
                      </td>

                      {/* Expiration */}
                      <td className="py-3.5 px-4">
                        {exp ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-xs text-slate-800">
                              {exp.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                            <div>
                              {isExp ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                                  <XCircle size={12} /> Vencido hace {Math.abs(diffDays)}d
                                </span>
                              ) : isSoon ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 animate-pulse">
                                  <AlertTriangle size={12} /> Vence en {diffDays}d
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500">
                                  En {diffDays} días
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin vencimiento</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4">
                        {rest.subscription_notes ? (
                          <div className="text-xs text-slate-600 max-w-xs truncate bg-slate-50 p-2 rounded-lg border border-slate-100" title={rest.subscription_notes}>
                            <MessageSquare size={12} className="inline mr-1 text-slate-400" />
                            {rest.subscription_notes}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Sin notas</span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleExtendMonth(rest)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200"
                            title="Extender 30 días y marcar como activo"
                          >
                            <Plus size={14} />
                            <span>+1 Mes</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedRestaurant(rest);
                              setIsModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 shadow-sm"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RestaurantManagerModal
        restaurant={selectedRestaurant}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}

