"use client";

import { useState, useEffect } from "react";
import { getPlatformMetrics } from "../actions";
import { 
  AVAILABLE_MODULES, 
  PRESET_MODULE_PLANS, 
  ModuleKey 
} from "@/shared/types";
import { 
  Layers, 
  Sparkles, 
  Check, 
  UtensilsCrossed, 
  LayoutGrid, 
  ShoppingBag, 
  ClipboardList, 
  ChefHat, 
  Receipt, 
  FileText, 
  Wallet, 
  Package, 
  CalendarClock, 
  Store,
  RefreshCw,
  TrendingUp,
  Tag
} from "lucide-react";

const MODULE_ICONS: Record<string, any> = {
  menu: UtensilsCrossed,
  accounts: LayoutGrid,
  orders: ShoppingBag,
  kitchen: ChefHat,
  invoices: FileText,
  finances: Wallet,
  inventory: Package,
  reservations: CalendarClock,
  branches: Store
};

const CATEGORY_INFO: Record<string, { label: string; badge: string }> = {
  salon: { label: "Salón & Mostrador", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  cocina: { label: "Cocina & KDS", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  caja: { label: "Caja & Facturación", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  gestion: { label: "Gestión & Operaciones", badge: "bg-purple-50 text-purple-700 border-purple-200" }
};

export default function AdminModulesPage() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPlatformMetrics();
      setMetrics(data);
    } catch (err) {
      console.error("Error loading metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRest = metrics?.totalRestaurants || 1;
  const moduleCounts = metrics?.moduleCounts || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Catálogo de Módulos & Planes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Estructura modular de Servido. Cada restaurante puede contratar módulos independientes o paquetes predefinidos.
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

      {/* Preset Plans Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <h2 className="text-base font-bold text-slate-900">
            Planes Predefinidos Recomendados
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Plantillas listas para configurar restaurantes con 1 clic en el panel de administración.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(PRESET_MODULE_PLANS).map(([key, plan]) => {
            const isFull = key === "FULL";
            return (
              <div 
                key={key}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isFull 
                    ? "bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border-indigo-200 shadow-sm" 
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Plantilla
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {plan.modules.length} mods
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mb-2">
                    {plan.name}
                  </h3>

                  <div className="space-y-1 my-3">
                    {plan.modules.map(modKey => (
                      <div key={modKey} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Check size={12} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{AVAILABLE_MODULES[modKey]?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  {key === 'MENU_ONLY' && "Menú digital interactivo con QR"}
                  {key === 'BASIC' && "Para comida rápida, barra y pedidos"}
                  {key === 'DINE_IN' && "Salón + Mesas y Cuentas + Cocina"}
                  {key === 'STANDARD' && "Salón + Pedidos + Cocina + Finanzas"}
                  {key === 'FULL' && "Operación total con facturación e inventario"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9 Canonical Modules Catalog */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Los 9 Módulos Oficiales del Sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(AVAILABLE_MODULES).map((mod) => {
            const Icon = MODULE_ICONS[mod.key] || Layers;
            const cat = CATEGORY_INFO[mod.category] || { label: mod.category, badge: "bg-slate-100 text-slate-700 border-slate-200" };
            const count = moduleCounts[mod.key] || 0;
            const percent = totalRest > 0 ? Math.round((count / totalRest) * 100) : 0;

            return (
              <div 
                key={mod.key} 
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                      <Icon size={20} />
                    </div>
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${cat.badge}`}>
                      {cat.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1">
                    {mod.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Rutas protegidas:</span>
                    <span className="font-mono text-slate-600 font-medium">
                      {mod.routes.join(", ")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Adopción en la plataforma:</span>
                      <span className="font-bold text-slate-800">
                        {count} restaurantes ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

