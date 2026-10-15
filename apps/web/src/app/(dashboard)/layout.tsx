"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { usePathname } from "next/navigation";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { LoadingState } from "@/components/LoadingState";
import { AVAILABLE_MODULES, ModuleKey, CanonicalModuleKey } from "@/shared/types";
import { Lock, Sparkles, ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";

function getRequiredModuleForPath(pathname: string): CanonicalModuleKey | null {
  if (pathname.startsWith('/kitchen')) return 'kitchen';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/accounts') || pathname.startsWith('/tables')) return 'accounts';
  if (pathname.startsWith('/invoices') || pathname.startsWith('/settings/siat')) return 'invoices';
  if (pathname.startsWith('/finances')) return 'finances';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/menu')) return 'menu';
  if (pathname.startsWith('/reservations') || pathname.startsWith('/settings/reservations')) return 'reservations';
  if (pathname.startsWith('/branches')) return 'branches';
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isKitchen = pathname === "/kitchen";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { loading, restaurant, billingCycle, hasModule } = useRestaurantSession();

  if (loading) {
    return <LoadingState />;
  }

  // Si no está cargando pero no hay restaurante, el hook useRestaurantSession ya se encarga de redirigir
  if (!restaurant) {
    return null;
  }

  // 1. Verificación general de estado de suscripción
  const isMenuOrSettings = pathname.startsWith('/menu') || pathname.startsWith('/settings');
  const isSubscriptionActive = restaurant.subscription_status === 'active';
  const shouldBlockSubscription = !isSubscriptionActive && !isMenuOrSettings;

  if (shouldBlockSubscription) {
    if (isKitchen) {
       return (
         <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <Lock size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Suscripción Inactiva</h2>
              <p className="text-gray-500 mb-6">Para acceder a este módulo y operar tu restaurante, necesitas activar un plan.</p>
              <Link href="/settings/subscription" className="bg-[#E76F51] text-white px-6 py-3 rounded-xl font-bold inline-block hover:bg-[#d65e40] transition-colors">
                Ver Planes de Suscripción
              </Link>
            </div>
         </div>
       );
    }
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="lg:ml-64 flex-1 p-4 lg:p-8 flex items-center justify-center">
           <div className="text-center max-w-md bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
              <Lock size={64} className="mx-auto text-gray-300 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Suscripción Inactiva</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">Para acceder a este módulo y comenzar a operar tu restaurante, necesitas elegir un plan de suscripción.</p>
              <Link href="/settings/subscription" className="bg-[#E76F51] text-white px-8 py-4 rounded-xl font-bold inline-block hover:bg-[#d65e40] transition-colors shadow-md">
                Activar Suscripción
              </Link>
           </div>
        </main>
      </div>
    );
  }

  // 2. Verificación de módulo específico contratado
  const requiredModule = getRequiredModuleForPath(pathname);
  let isModuleEnabled = true;

  if (requiredModule) {
    if (requiredModule === 'accounts') {
      isModuleEnabled = hasModule('accounts') || hasModule('tables') || hasModule('orders&accounts');
    } else if (requiredModule === 'orders') {
      isModuleEnabled = hasModule('orders') || hasModule('takeaway');
    } else {
      isModuleEnabled = hasModule(requiredModule);
    }
  }

  if (!isModuleEnabled && requiredModule) {
    const modInfo = AVAILABLE_MODULES[requiredModule];
    const moduleName = modInfo?.name || requiredModule;

    if (isKitchen) {
      return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <Lock size={48} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Módulo No Contratado</h2>
            <p className="text-gray-500 mb-6">
              Tu plan actual no incluye la pantalla de <strong>Cocina & KDS</strong>. Contacta al administrador para activarlo.
            </p>
            <Link href="/" className="bg-[#2F4F3E] text-white px-6 py-3 rounded-xl font-bold inline-block">
              Ir al Inicio
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="lg:ml-64 flex-1 p-4 lg:p-8 flex items-center justify-center">
          <div className="text-center max-w-lg bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600">
              <Lock size={32} />
            </div>
            
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
              Módulo Opcional
            </span>

            <h2 className="text-2xl font-bold text-slate-900 mt-4 mb-2">
              {moduleName} no está contratado
            </h2>

            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Tu restaurante no tiene habilitado este módulo en su suscripción actual. Con el nuevo sistema modular de Servido puedes activar únicamente los módulos que tu negocio necesite en cualquier momento.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>Volver al Inicio</span>
              </Link>

              <a
                href="https://wa.me/59160520338?text=Hola,%20deseo%20activar%20el%20módulo%20de%20mi%20restaurante"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                <span>Contactar a Soporte</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isKitchen) {
    return <div className="min-h-screen bg-[#F9FAFB]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {billingCycle?.limit_exceeded && (
        <div className="bg-[#E76F51] text-white text-center py-2 px-4 text-sm font-medium">
          Has superado tu límite de tickets mensuales. Tu servicio sigue activo sin interrupciones. El excedente será facturado en el próximo ciclo.
        </div>
      )}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className="lg:ml-64 flex-1 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}
