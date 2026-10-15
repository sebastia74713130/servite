"use client";

import Link from "next/link";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { DashboardCard } from "@/components/DashboardCard";
import { LoadingState } from "@/components/LoadingState";
import { ModuleInfoModal } from "@/components/ModuleInfoModal";
import { formatPrice } from "@shared/utils";
import { 
  AVAILABLE_MODULES, 
  CANONICAL_MODULE_KEYS, 
  CanonicalModuleKey 
} from "@/shared/types";
import { 
  Inbox, 
  Flame, 
  DollarSign, 
  ShoppingBag, 
  ChefHat, 
  Receipt, 
  ClipboardList,
  UtensilsCrossed,
  LayoutGrid,
  FileText,
  Wallet,
  Package,
  CalendarClock,
  Store,
  Lock,
  ArrowRight,
  Info,
  MessageCircle,
  Headphones,
  Mail,
  Phone,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

const MODULE_ICONS: Record<CanonicalModuleKey, any> = {
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

const MODULE_ACCENT_STYLES: Record<CanonicalModuleKey, { 
  iconBg: string; 
  iconText: string; 
  hoverBorder: string;
  badgeBg: string;
}> = {
  menu: { 
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100", 
    iconText: "text-emerald-600",
    hoverBorder: "hover:border-emerald-500/40",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  accounts: { 
    iconBg: "bg-blue-50 text-blue-600 border border-blue-100", 
    iconText: "text-blue-600",
    hoverBorder: "hover:border-blue-500/40",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200"
  },
  orders: { 
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100", 
    iconText: "text-amber-600",
    hoverBorder: "hover:border-amber-500/40",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200"
  },
  kitchen: { 
    iconBg: "bg-orange-50 text-orange-600 border border-orange-100", 
    iconText: "text-orange-600",
    hoverBorder: "hover:border-orange-500/40",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200"
  },
  invoices: { 
    iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-100", 
    iconText: "text-indigo-600",
    hoverBorder: "hover:border-indigo-500/40",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  finances: { 
    iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100", 
    iconText: "text-emerald-700",
    hoverBorder: "hover:border-emerald-600/40",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
  },
  inventory: { 
    iconBg: "bg-purple-50 text-purple-600 border border-purple-100", 
    iconText: "text-purple-600",
    hoverBorder: "hover:border-purple-500/40",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200"
  },
  reservations: { 
    iconBg: "bg-pink-50 text-pink-600 border border-pink-100", 
    iconText: "text-pink-600",
    hoverBorder: "hover:border-pink-500/40",
    badgeBg: "bg-pink-50 text-pink-700 border-pink-200"
  },
  branches: { 
    iconBg: "bg-teal-50 text-teal-600 border border-teal-100", 
    iconText: "text-teal-600",
    hoverBorder: "hover:border-teal-500/40",
    badgeBg: "bg-teal-50 text-teal-700 border-teal-200"
  }
};

const CATEGORY_NAMES: Record<string, string> = {
  salon: "Salón & Mostrador",
  cocina: "Cocina & KDS",
  caja: "Caja & Facturación",
  gestion: "Gestión & Operaciones"
};

export default function InicioPage() {
  const { restaurant, branch, loading: sessionLoading, hasModule } = useRestaurantSession();
  const { stats, loading: statsLoading } = useDashboardStats(restaurant?.id, branch?.id);
  const [callingTablesCount, setCallingTablesCount] = useState(0);

  // Modal de información de módulo
  const [selectedModuleForModal, setSelectedModuleForModal] = useState<CanonicalModuleKey | null>(null);

  // Saludo dinámico según la hora
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "¡Buen día";
    if (hour < 19) return "¡Buenas tardes";
    return "¡Buenas noches";
  }, []);

  // Suscripción en tiempo real a llamados de mesas
  useEffect(() => {
    if (!restaurant?.id) return;

    const fetchCalling = async () => {
      let query = supabase
        .from('tables')
        .select('service_status')
        .eq('restaurant_id', restaurant.id);
      if (branch?.id) query = query.eq('branch_id', branch.id);
      const { data } = await query;
      
      const count = data?.filter(t => t.service_status !== null).length || 0;
      setCallingTablesCount(count);
    };

    fetchCalling();

    const channelTables = supabase
      .channel(`public:tables_dashboard_${Math.random()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => fetchCalling()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelTables);
    };
  }, [restaurant?.id, branch?.id]);

  // Lista ordenada de los 9 módulos: primero los activos, luego los disponibles
  const sortedModules = useMemo(() => {
    const active: CanonicalModuleKey[] = [];
    const inactive: CanonicalModuleKey[] = [];

    CANONICAL_MODULE_KEYS.forEach((key) => {
      // Normalización de llaves de compatibilidad
      let isModActive = false;
      if (key === 'accounts') {
        isModActive = hasModule('accounts') || hasModule('tables') || hasModule('orders&accounts');
      } else if (key === 'orders') {
        isModActive = hasModule('orders') || hasModule('takeaway');
      } else {
        isModActive = hasModule(key);
      }

      if (isModActive) {
        active.push(key);
      } else {
        inactive.push(key);
      }
    });

    return [...active, ...inactive];
  }, [hasModule]);

  if (sessionLoading || statsLoading) {
    return <LoadingState />;
  }

  // Verificaciones de módulos para sugerencias sutiles en métricas
  const hasOrdersModule = hasModule('orders') || hasModule('takeaway') || hasModule('accounts') || hasModule('tables');
  const hasKitchenModule = hasModule('kitchen');

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Header de Bienvenida Profesional */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#1F2933] tracking-tight">
              {greeting}, {restaurant?.name || "Restaurante"}
            </h1>
            <span className="inline-block animate-wave text-xl">👋</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Resumen operativo y ecosistema de módulos para tu restaurante.
          </p>
        </div>

        {/* Chips de información de local */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {branch && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 flex items-center gap-1.5">
              <Store size={13} className="text-slate-500" />
              <span>{branch.name}</span>
            </span>
          )}
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistema Operativo</span>
          </span>
        </div>
      </div>

      {/* 2. Métricas del Día (4 KPIs solicitados) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider text-xs">
            Métricas de Hoy
          </h2>
          <span className="text-xs text-slate-400">Actualizado en tiempo real</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Pedidos nuevos */}
          <DashboardCard 
            title="Pedidos nuevos" 
            value={stats.nuevos} 
            icon={Inbox} 
            badgeColor="blue"
            subtitle={hasOrdersModule ? "Por atender en cola" : undefined}
            hint={!hasOrdersModule ? {
              text: "Activar módulo Pedidos",
              onClick: () => setSelectedModuleForModal('orders')
            } : undefined}
          />

          {/* 2. En preparación */}
          <DashboardCard 
            title="En preparación" 
            value={stats.preparacion} 
            icon={Flame} 
            badgeColor="terracotta"
            subtitle={hasKitchenModule ? "Actualmente en cocina" : undefined}
            hint={!hasKitchenModule ? {
              text: "Activar Cocina KDS",
              onClick: () => setSelectedModuleForModal('kitchen')
            } : undefined}
          />

          {/* 3. Ventas del día */}
          <DashboardCard 
            title="Ventas del día" 
            value={formatPrice(stats.ventas)} 
            icon={DollarSign} 
            badgeColor="gold"
            subtitle="Monto total cobrado hoy"
          />

          {/* 4. Productos vendidos */}
          <DashboardCard 
            title="Productos vendidos" 
            value={stats.productosVendidos || 0} 
            icon={ShoppingBag} 
            badgeColor="purple"
            subtitle="Unidades despachadas hoy"
          />
        </div>
      </section>

      {/* 3. Ecosistema de Módulos (Cuadrícula Unificada) */}
      <section className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#1F2933]">
              Módulos de Servido
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accede a tus herramientas activas o explora nuevas funciones para potenciar tu negocio.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Activos</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Disponibles</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedModules.map((modKey) => {
            const def = AVAILABLE_MODULES[modKey];
            if (!def) return null;

            // Verificación si el módulo está activo
            let isActive = false;
            if (modKey === 'accounts') {
              isActive = hasModule('accounts') || hasModule('tables') || hasModule('orders&accounts');
            } else if (modKey === 'orders') {
              isActive = hasModule('orders') || hasModule('takeaway');
            } else {
              isActive = hasModule(modKey);
            }

            const Icon = MODULE_ICONS[modKey] || LayoutGrid;
            const style = MODULE_ACCENT_STYLES[modKey];
            const primaryRoute = def.routes[0] || "/";

            // WhatsApp link para solicitud directa
            const whatsappMsg = encodeURIComponent(
              `Hola Servido, soy del restaurante *${restaurant?.name || ''}*. Me interesa activar el módulo de *${def.name}*. ¿Podrían orientarme?`
            );
            const whatsappUrl = `https://wa.me/59160520338?text=${whatsappMsg}`;

            // Micro-estado para módulos activos
            let liveStatusText: string | null = null;
            if (isActive) {
              if (modKey === 'accounts' && callingTablesCount > 0) {
                liveStatusText = `🛎️ ${callingTablesCount} llamada${callingTablesCount > 1 ? 's' : ''} en mesa`;
              } else if (modKey === 'orders' && stats.nuevos > 0) {
                liveStatusText = `🍔 ${stats.nuevos} pedido${stats.nuevos > 1 ? 's' : ''} nuevo${stats.nuevos > 1 ? 's' : ''}`;
              } else if (modKey === 'kitchen' && stats.preparacion > 0) {
                liveStatusText = `🔥 ${stats.preparacion} comanda${stats.preparacion > 1 ? 's' : ''} en fuego`;
              }
            }

            return (
              <div
                key={modKey}
                className={`relative bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
                  isActive 
                    ? `border-slate-200 shadow-sm hover:shadow-md ${style.hoverBorder}` 
                    : "border-slate-200/70 bg-gradient-to-b from-white to-slate-50/50 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="p-6">
                  {/* Fila Superior: Icono y Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${style.iconBg}`}>
                      <Icon size={26} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <Lock size={11} className="text-slate-400" />
                          <span>Disponible</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Título y Categoría */}
                  <div className="mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {CATEGORY_NAMES[def.category] || def.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2F4F3E] transition-colors mt-0.5">
                      {def.name}
                    </h3>
                  </div>

                  {/* Descripción Breve */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {def.description}
                  </p>

                  {/* Micro-métrica o dato en vivo si aplica */}
                  {liveStatusText && (
                    <div className="mt-3 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-xs font-bold text-amber-800 inline-block animate-pulse">
                      {liveStatusText}
                    </div>
                  )}
                </div>

                {/* Pie de la Tarjeta con Acciones */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                  {/* Botón Ver Información */}
                  <button
                    type="button"
                    onClick={() => setSelectedModuleForModal(modKey)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Info size={14} className="text-slate-400" />
                    <span>Ver info</span>
                  </button>

                  {/* Botón Principal (Entrar si está activo, Solicitar si no lo está) */}
                  {isActive ? (
                    <Link
                      href={primaryRoute}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#2F4F3E] hover:bg-[#253f32] text-white rounded-xl shadow-xs transition-all group-hover:shadow-sm"
                    >
                      <span>Entrar</span>
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all"
                    >
                      <MessageCircle size={14} />
                      <span>Solicitar</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Bloque Profesional de Contacto y Soporte */}
      <section className="pt-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2F4F3E] via-[#264133] to-[#1c3227] rounded-3xl p-8 text-white shadow-lg border border-emerald-950/20">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-3 border border-white/10">
                <Headphones size={13} />
                <span>Soporte Técnico y Asesoría Servido</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                ¿Necesitas ayuda o deseas activar un nuevo módulo?
              </h3>
              <p className="text-emerald-100/80 text-sm mt-2 leading-relaxed">
                Nuestro equipo está listo para ayudarte con la configuración de tu restaurante, dudas operativas o la activación personalizada de módulos adicionales.
              </p>

              {/* Datos de contacto */}
              <div className="flex flex-wrap items-center gap-6 mt-5 text-xs text-emerald-100/90">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-emerald-300" />
                  <span className="font-semibold">+591 60520338</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-emerald-300" />
                  <span>soporte@servido.app</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-emerald-300" />
                  <span>Lunes a Domingo • 08:00 a 23:00</span>
                </div>
              </div>
            </div>

            {/* Botones de acción de soporte */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <a
                href={`https://wa.me/59160520338?text=${encodeURIComponent(`Hola Servido, soy del restaurante *${restaurant?.name || ''}*. Necesito asistencia de soporte técnico.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all"
              >
                <MessageCircle size={18} />
                <span>Escribir por WhatsApp</span>
              </a>

              <a
                href="mailto:soporte@servido.app"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-2xl border border-white/20 transition-all text-center"
              >
                <Mail size={15} />
                <span>Enviar correo de soporte</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Modal interactivo de información de módulo */}
      <ModuleInfoModal
        isOpen={selectedModuleForModal !== null}
        onClose={() => setSelectedModuleForModal(null)}
        moduleKey={selectedModuleForModal}
        isActive={selectedModuleForModal ? hasModule(selectedModuleForModal) : false}
        restaurantName={restaurant?.name}
      />
    </div>
  );
}
