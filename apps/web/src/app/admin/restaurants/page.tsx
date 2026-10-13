"use client";

import { useState, useEffect, useTransition } from "react";
import { getAdminRestaurants, toggleRestaurantActive } from "../actions";
import { AVAILABLE_MODULES, ModuleKey } from "@/shared/types";
import { RestaurantManagerModal } from "./RestaurantManagerModal";
import { 
  Building2, 
  Search, 
  Filter, 
  Layers, 
  ExternalLink, 
  Settings2, 
  Power, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Sparkles
} from "lucide-react";

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Selected restaurant for modal
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminRestaurants({
        search,
        status: statusFilter,
        module: moduleFilter
      });
      setRestaurants(data);
    } catch (err) {
      console.error("Error loading restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, moduleFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleActive = async (restaurant: any) => {
    const nextState = !restaurant.is_active;
    const confirmMsg = nextState 
      ? `¿Reactivar el acceso para "${restaurant.name}"?` 
      : `¿Suspender temporalmente el acceso para "${restaurant.name}"? El restaurante no podrá iniciar sesión.`;
    
    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        await toggleRestaurantActive(restaurant.id, nextState);
        await loadData();
      } catch (err: any) {
        alert(err.message || "Error al actualizar estado");
      }
    });
  };

  const openManager = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setIsModalOpen(true);
  };

  const getExpirationBadge = (expiresAtStr?: string, status?: string) => {
    if (!expiresAtStr) {
      return (
        <span className="text-xs text-slate-400 font-medium">
          Permanente / Sin exp.
        </span>
      );
    }

    const exp = new Date(expiresAtStr);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700">
          <XCircle size={12} />
          Vencido ({Math.abs(diffDays)}d)
        </span>
      );
    }

    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
          <AlertTriangle size={12} />
          Vence en {diffDays}d
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
        <Calendar size={12} />
        {exp.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })} ({diffDays}d)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Gestión de Restaurantes & Módulos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controla las suscripciones, módulos activos a la medida y estados de acceso de cada negocio.
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, slug, ciudad o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={16} className="text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="expired">Vencidos</option>
            <option value="suspended">Suspendidos</option>
          </select>

          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos los módulos</option>
            {Object.values(AVAILABLE_MODULES).map((m) => (
              <option key={m.key} value={m.key}>
                Con: {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Mostrando {restaurants.length} restaurantes encontrados</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Activos ({restaurants.filter(r => r.subscription_status === 'active').length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Vencidos ({restaurants.filter(r => r.subscription_status === 'expired').length})
          </span>
        </div>
      </div>

      {/* Restaurants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Restaurante</th>
                <th className="py-3.5 px-4">Contacto / Dueño</th>
                <th className="py-3.5 px-4">Plan & Cobro</th>
                <th className="py-3.5 px-4">Estado / Vencimiento</th>
                <th className="py-3.5 px-4">Módulos Activos</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Cargando restaurantes...
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron restaurantes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                restaurants.map((rest) => {
                  const mods: ModuleKey[] = Array.isArray(rest.enabled_modules) ? rest.enabled_modules : [];
                  const isActive = rest.is_active && rest.subscription_status === "active";

                  return (
                    <tr key={rest.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Slug */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                            {rest.name ? rest.name.slice(0, 2).toUpperCase() : "RS"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{rest.name}</span>
                              {rest.branches_count > 1 && (
                                <span className="px-1.5 py-0.2 text-[10px] bg-slate-100 text-slate-600 rounded font-normal">
                                  {rest.branches_count} sucursales
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <a
                                href={`/menu/${rest.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                /{rest.slug}
                                <ExternalLink size={10} />
                              </a>
                              {rest.city && (
                                <span className="flex items-center gap-0.5 text-slate-400">
                                  <MapPin size={10} />
                                  {rest.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="text-xs text-slate-800 flex items-center gap-1.5 font-medium truncate max-w-[180px]">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate" title={rest.owner_email}>
                              {rest.owner_email || "No registrado"}
                            </span>
                          </div>
                          {rest.phone && (
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Phone size={12} className="text-slate-400 shrink-0" />
                              <span>{rest.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Plan & Pricing */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {rest.subscription_plan || "BASIC"}
                          </span>
                          <div className="text-xs font-semibold text-slate-900 mt-1">
                            {rest.monthly_price !== null && rest.monthly_price !== undefined
                              ? `Bs. ${Number(rest.monthly_price).toLocaleString("es-BO")}/mes`
                              : "Bs. 0/mes"}
                          </div>
                        </div>
                      </td>

                      {/* Status & Expiration */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 size={12} /> Activo
                              </span>
                            ) : rest.subscription_status === "expired" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                <XCircle size={12} /> Vencido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                <AlertTriangle size={12} /> Suspendido
                              </span>
                            )}
                          </div>
                          <div>
                            {getExpirationBadge(rest.subscription_expires_at, rest.subscription_status)}
                          </div>
                        </div>
                      </td>

                      {/* Modules */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">
                              {mods.length}/11 módulos
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${(mods.length / 11) * 100}%` }}
                              />
                            </div>
                          </div>
                          {/* Mini pills for first few modules */}
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {mods.slice(0, 4).map((m) => (
                              <span
                                key={m}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded"
                              >
                                {AVAILABLE_MODULES[m]?.name.split(" ")[0]}
                              </span>
                            ))}
                            {mods.length > 4 && (
                              <span className="px-1 py-0.5 text-[10px] font-medium text-slate-400">
                                +{mods.length - 4} más
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openManager(rest)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors font-medium text-xs flex items-center gap-1"
                            title="Gestionar Módulos y Suscripción"
                          >
                            <Settings2 size={16} />
                            <span className="hidden sm:inline">Gestionar</span>
                          </button>

                          <button
                            onClick={() => handleToggleActive(rest)}
                            className={`p-2 rounded-xl transition-colors text-xs ${
                              rest.is_active
                                ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={rest.is_active ? "Suspender acceso" : "Reactivar acceso"}
                          >
                            <Power size={16} />
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

      {/* Modal */}
      <RestaurantManagerModal
        restaurant={selectedRestaurant}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}

