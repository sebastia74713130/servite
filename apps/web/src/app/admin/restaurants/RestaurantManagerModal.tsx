"use client";

import { useState, useEffect } from "react";
import { 
  AVAILABLE_MODULES, 
  PRESET_MODULE_PLANS, 
  ModuleKey, 
  SubscriptionPlan 
} from "@/shared/types";
import { 
  updateRestaurantSubscription, 
  updateRestaurantModules 
} from "../actions";
import { 
  X, 
  Check, 
  Layers, 
  CreditCard, 
  Calendar, 
  Sparkles, 
  Save, 
  Loader2, 
  AlertCircle,
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
  Clock
} from "lucide-react";

interface RestaurantManagerModalProps {
  restaurant: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const MODULE_ICONS: Record<ModuleKey, any> = {
  menu: UtensilsCrossed,
  tables: LayoutGrid,
  takeaway: ShoppingBag,
  orders: ClipboardList,
  kitchen: ChefHat,
  accounts: Receipt,
  invoices: FileText,
  finances: Wallet,
  inventory: Package,
  reservations: CalendarClock,
  branches: Store
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  salon: { label: "Salón & Comensales", color: "bg-blue-50 text-blue-700 border-blue-200" },
  cocina: { label: "Cocina & KDS", color: "bg-orange-50 text-orange-700 border-orange-200" },
  caja: { label: "Caja & Facturación", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  gestion: { label: "Gestión & Inventario", color: "bg-purple-50 text-purple-700 border-purple-200" }
};

export function RestaurantManagerModal({
  restaurant,
  isOpen,
  onClose,
  onSaved
}: RestaurantManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"modules" | "subscription">("modules");
  
  // Subscription state
  const [plan, setPlan] = useState<SubscriptionPlan>("BASIC");
  const [status, setStatus] = useState<"active" | "inactive" | "expired" | "suspended">("active");
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "semiannual" | "annual">("monthly");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Modules state
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setPlan(restaurant.subscription_plan || "BASIC");
      setStatus(restaurant.subscription_status || "active");
      setMonthlyPrice(restaurant.monthly_price !== null && restaurant.monthly_price !== undefined ? Number(restaurant.monthly_price) : 0);
      setBillingPeriod(restaurant.billing_period || "monthly");
      
      if (restaurant.subscription_expires_at) {
        // Format to YYYY-MM-DD for date input
        const d = new Date(restaurant.subscription_expires_at);
        const iso = d.toISOString().split("T")[0];
        setExpiresAt(iso);
      } else {
        setExpiresAt("");
      }

      setNotes(restaurant.subscription_notes || "");

      // Modules
      const mods = Array.isArray(restaurant.enabled_modules) && restaurant.enabled_modules.length > 0
        ? restaurant.enabled_modules
        : Object.keys(AVAILABLE_MODULES) as ModuleKey[];
      setSelectedModules(mods);

      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [restaurant, isOpen]);

  if (!isOpen || !restaurant) return null;

  const toggleModule = (modKey: ModuleKey) => {
    setSelectedModules(prev => 
      prev.includes(modKey) ? prev.filter(m => m !== modKey) : [...prev, modKey]
    );
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_MODULE_PLANS[presetKey];
    if (preset) {
      setSelectedModules([...preset.modules]);
      setSuccessMsg(`Plantilla "${preset.name}" aplicada`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const selectAll = () => {
    setSelectedModules(Object.keys(AVAILABLE_MODULES) as ModuleKey[]);
  };

  const deselectAll = () => {
    setSelectedModules([]);
  };

  const addDaysToExpiration = (days: number) => {
    const baseDate = expiresAt ? new Date(expiresAt) : new Date();
    // In case base date was past, add from today
    const start = baseDate < new Date() ? new Date() : baseDate;
    const newDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setExpiresAt(newDate.toISOString().split("T")[0]);
    setStatus("active");
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Guardar módulos
      await updateRestaurantModules(restaurant.id, selectedModules);

      // 2. Guardar suscripción
      await updateRestaurantSubscription(restaurant.id, {
        plan,
        status,
        monthly_price: Number(monthlyPrice),
        billing_period: billingPeriod,
        expires_at: expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null,
        notes: notes.trim() || null
      });

      setSuccessMsg("¡Cambios guardados con éxito!");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar cambios");
      setSaving(false);
    }
  };

  // Agrupar módulos por categoría
  const modulesByCategory: Record<string, ModuleKey[]> = {
    salon: ['menu', 'tables', 'takeaway', 'orders'],
    cocina: ['kitchen'],
    caja: ['accounts', 'invoices', 'finances'],
    gestion: ['inventory', 'reservations', 'branches']
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{restaurant.name}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                status === 'active' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : status === 'expired'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Slug: <span className="font-mono text-slate-600">/{restaurant.slug}</span> • Ciudad: {restaurant.city || "No especificada"}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 border-b border-slate-100 flex gap-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("modules")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "modules"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={16} />
            <span>Módulos Habilitados</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">
              {selectedModules.length}/11
            </span>
          </button>

          <button
            onClick={() => setActiveTab("subscription")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "subscription"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard size={16} />
            <span>Suscripción & Precios</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "modules" && (
            <div className="space-y-6">
              {/* Presets Bar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Plantillas de Planes (1 Clic)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button 
                      onClick={selectAll}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">•</span>
                    <button 
                      onClick={deselectAll}
                      className="text-slate-500 hover:underline font-medium"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {Object.entries(PRESET_MODULE_PLANS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      type="button"
                      className="px-3 py-2 text-xs font-medium bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-slate-700 hover:text-indigo-700 transition-all text-center truncate shadow-sm"
                      title={`${preset.name}: ${preset.modules.join(", ")}`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tax Regime Selector (Régimen General vs Régimen Simplificado) */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Régimen Tributario del Restaurante
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                    selectedModules.includes('invoices')
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {selectedModules.includes('invoices') ? 'RÉGIMEN GENERAL (SIAT)' : 'RÉGIMEN SIMPLIFICADO'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedModules.includes('invoices')) {
                        setSelectedModules(prev => [...prev, 'invoices']);
                        setSuccessMsg('Régimen General activado (Módulo Facturación SIAT habilitado)');
                        setTimeout(() => setSuccessMsg(null), 3000);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedModules.includes('invoices')
                        ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white/80 border-slate-200 hover:border-slate-300 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <span className="font-bold text-xs text-slate-900">Régimen General (Con Factura)</span>
                      </div>
                      {selectedModules.includes('invoices') && (
                        <Check size={14} className="text-blue-600" strokeWidth={3} />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Emite facturas electrónicas computarizadas validadas por Impuestos Nacionales (SIAT). Pide NIT/CI a clientes.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModules(prev => prev.filter(m => m !== 'invoices'));
                      setSuccessMsg('Régimen Simplificado activado (Módulo Facturación SIAT deshabilitado)');
                      setTimeout(() => setSuccessMsg(null), 3000);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      !selectedModules.includes('invoices')
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                        : 'bg-white/80 border-slate-200 hover:border-slate-300 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt size={16} className="text-amber-600" />
                        <span className="font-bold text-xs text-slate-900">Régimen Simplificado (Sin Factura)</span>
                      </div>
                      {!selectedModules.includes('invoices') && (
                        <Check size={14} className="text-amber-600" strokeWidth={3} />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Emite comprobantes y notas de venta de consumo. No interactúa con SIAT ni solicita NIT a los comensales.
                    </p>
                  </button>
                </div>
              </div>

              {/* Module Groups */}
              {Object.entries(modulesByCategory).map(([catKey, modKeys]) => {
                const catInfo = CATEGORY_LABELS[catKey];
                return (
                  <div key={catKey} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modKeys.map(key => {
                        const mod = AVAILABLE_MODULES[key];
                        const isSelected = selectedModules.includes(key);
                        const Icon = MODULE_ICONS[key] || Layers;

                        return (
                          <div
                            key={key}
                            onClick={() => toggleModule(key)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                              isSelected
                                ? "bg-indigo-50/50 border-indigo-200 shadow-sm"
                                : "bg-white border-slate-200/80 hover:border-slate-300 opacity-70"
                            }`}
                          >
                            <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}>
                              <Icon size={18} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-sm font-semibold truncate ${
                                  isSelected ? "text-slate-900" : "text-slate-600"
                                }`}>
                                  {mod.name}
                                </h4>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                  isSelected ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white"
                                }`}>
                                  {isSelected && <Check size={14} strokeWidth={3} />}
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {mod.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan Base */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Plan Comercial
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CUSTOM">CUSTOM (A la medida según módulos)</option>
                    <option value="BASIC">BASIC (Menú Digital & Barra)</option>
                    <option value="PRO">PRO (Salón & Mesas)</option>
                    <option value="FULL">FULL (Total Todo Incluido)</option>
                    <option value="TEST">TEST (Prueba / Gratuito)</option>
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estado de Acceso
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Activo (Acceso Completo)</option>
                    <option value="expired">Vencido (Bloqueado por falta de pago)</option>
                    <option value="suspended">Suspendido (Desactivado manualmente)</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                {/* Precio Mensual */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Precio Mensual Acordado (Bs.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">Bs.</span>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Período de Facturación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Frecuencia de Facturación
                  </label>
                  <select
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="semiannual">Semestral (6 meses)</option>
                    <option value="annual">Anual (12 meses)</option>
                  </select>
                </div>
              </div>

              {/* Vencimiento & Botones de Renovación Rápida */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <Calendar size={14} className="text-indigo-600" />
                    <span>Fecha de Vencimiento de Suscripción</span>
                  </label>
                  {expiresAt && (
                    <button
                      type="button"
                      onClick={() => setExpiresAt("")}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Sin vencimiento (Ilimitado)
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full sm:w-60 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* Botones de extensión rápida */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
                      <Clock size={12} />
                      Extender:
                    </span>
                    <button
                      type="button"
                      onClick={() => addDaysToExpiration(30)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg shadow-sm transition-colors"
                    >
                      +1 Mes
                    </button>
                    <button
                      type="button"
                      onClick={() => addDaysToExpiration(90)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg shadow-sm transition-colors"
                    >
                      +3 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => addDaysToExpiration(180)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg shadow-sm transition-colors"
                    >
                      +6 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => addDaysToExpiration(365)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg shadow-sm transition-colors"
                    >
                      +1 Año
                    </button>
                  </div>
                </div>
              </div>

              {/* Notas Internas / Convenio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas Internas de Cobro / Convenio Especial
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Pago realizado por QR banco Ganadero. Convenio de 3 meses promocional. Factura emitida..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedModules.length} de 11 módulos activos para este restaurante
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

