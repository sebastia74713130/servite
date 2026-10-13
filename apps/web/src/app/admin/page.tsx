"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlatformMetrics } from "./actions";
import { LoadingState } from "@/components/LoadingState";
import { AVAILABLE_MODULES, ModuleKey } from "@/shared/types";
import { 
  Store, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ArrowRight, 
  Boxes,
  Calendar,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPlatformMetrics();
        setMetrics(data);
      } catch (err) {
        console.error("Error loading metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingState />;

  const metricCards = [
    {
      title: "Total Restaurantes",
      value: metrics?.totalRestaurants || 0,
      desc: "Registrados en la plataforma",
      icon: Store,
      color: "bg-blue-500",
      lightColor: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      title: "Suscripciones Activas",
      value: metrics?.activeRestaurants || 0,
      desc: "Operando con normalidad",
      icon: CheckCircle2,
      color: "bg-emerald-500",
      lightColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    {
      title: "Próximos a Vencer (<7d)",
      value: metrics?.soonToExpireCount || 0,
      desc: "Requieren gestión de cobro",
      icon: Clock,
      color: "bg-amber-500",
      lightColor: metrics?.soonToExpireCount > 0 ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-400/20" : "bg-amber-50 text-amber-700 border-amber-200"
    },
    {
      title: "Vencidos / Inactivos",
      value: metrics?.expiredRestaurants || 0,
      desc: "Suscripción no renovada",
      icon: AlertTriangle,
      color: "bg-rose-500",
      lightColor: "bg-rose-50 text-rose-700 border-rose-200"
    },
    {
      title: "MRR Estimado",
      value: `Bs. ${(metrics?.estimatedMrr || 0).toLocaleString()}`,
      desc: "Ingreso mensual recurrente",
      icon: DollarSign,
      color: "bg-indigo-500",
      lightColor: "bg-indigo-50 text-indigo-700 border-indigo-200"
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider mb-3">
            <span>🛡️</span> Panel de Control Central
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Administración de Restaurantes & Módulos
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Supervisa las suscripciones activas, gestiona los módulos habilitados por cada cliente y mantén el control total de la plataforma Servido.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/admin/restaurants"
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              <Store size={16} />
              <span>Gestionar Restaurantes</span>
            </Link>
            <Link
              href="/admin/subscriptions"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all"
            >
              <Clock size={16} />
              <span>Ver Vencimientos</span>
            </Link>
          </div>
        </div>

        {/* Ambient background shape */}
        <div className="absolute right-[-10%] top-[-30%] w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${card.color} shadow-sm`}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {card.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Alerta de Vencimientos & Restaurantes Recientes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card: Próximos a Vencer */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Suscripciones Próximas a Vencer (&lt;7 días)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Restaurantes que requieren cobro o renovación inmediata
                  </p>
                </div>
              </div>
              <Link
                href="/admin/subscriptions"
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
              >
                <span>Ver todas</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {metrics?.soonToExpire && metrics.soonToExpire.length > 0 ? (
                metrics.soonToExpire.map((r: any) => {
                  const expDate = new Date(r.subscription_expires_at);
                  const diffDays = Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={r.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                          {r.name?.charAt(0) || "R"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span className="text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                              Vence en {diffDays} {diffDays === 1 ? 'día' : 'días'}
                            </span>
                            <span>•</span>
                            <span>{expDate.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/admin/restaurants?search=${encodeURIComponent(r.name)}`}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
                      >
                        Gestionar
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No hay vencimientos en los próximos 7 días</p>
                  <p className="text-xs text-slate-400 mt-0.5">Todas las suscripciones activas se encuentran al día</p>
                </div>
              )}
            </div>
          </div>

          {/* Card: Registros Recientes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Últimos Restaurantes Registrados
                  </h2>
                  <p className="text-xs text-slate-400">
                    Nuevos clientes en la plataforma
                  </p>
                </div>
              </div>
              <Link
                href="/admin/restaurants"
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
              >
                <span>Ver lista completa</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {metrics?.recentRestaurants && metrics.recentRestaurants.length > 0 ? (
                metrics.recentRestaurants.map((r: any) => (
                  <div key={r.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {r.name?.charAt(0) || "R"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
                        <p className="text-xs text-slate-400">
                          Registrado el {new Date(r.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      r.subscription_status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.subscription_status || 'Inactivo'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm">No hay registros recientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Distribución de Módulos Contratados */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Boxes size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Adopción de Módulos
                </h3>
              </div>
              <Link href="/admin/modules" className="text-xs text-rose-600 font-bold hover:underline">
                Catálogo
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Cantidad de restaurantes que tienen activo cada módulo de la plataforma:
            </p>

            <div className="space-y-3.5">
              {Object.entries(AVAILABLE_MODULES).map(([key, def]) => {
                const count = metrics?.moduleCounts?.[key] || 0;
                const total = metrics?.totalRestaurants || 1;
                const percentage = Math.round((count / total) * 100);

                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{def.name}</span>
                      <span className="font-bold text-slate-900">
                        {count} <span className="text-slate-400 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

