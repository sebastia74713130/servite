"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "./actions";
import { LoadingState } from "@/components/LoadingState";
import { 
  LayoutDashboard, 
  Store, 
  CreditCard, 
  Boxes, 
  ShieldCheck, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X,
  ExternalLink,
  Users
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login?redirect=/admin");
          return;
        }

        setAdminEmail(session.user.email || null);
        const hasAccess = await isSuperAdmin(session.user.id, session.user.email);
        setAuthorized(hasAccess);
      } catch (err) {
        console.error("Error verifying SuperAdmin access:", err);
        setAuthorized(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    verifyAdmin();
  }, [router]);

  if (checkingAuth) {
    return <LoadingState />;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mb-6 shadow-2xl">
          <ShieldAlert size={44} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">
          Acceso Restringido
        </h1>
        <p className="text-slate-400 max-w-md text-base leading-relaxed mb-8">
          Esta área está reservada exclusivamente para el equipo de administración de la plataforma <strong className="text-white font-semibold">Servido</strong>. Tu cuenta ({adminEmail || "usuario actual"}) no cuenta con permisos de SuperAdmin.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-md text-sm text-center"
          >
            Ir al Restaurante
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const navLinks = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Restaurantes & Módulos", href: "/admin/restaurants", icon: Store },
    { name: "Suscripciones", href: "/admin/subscriptions", icon: CreditCard },
    { name: "Catálogo de Módulos", href: "/admin/modules", icon: Boxes },
    { name: "Administradores", href: "/admin/admins", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SuperAdmin Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-rose-500/20">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg tracking-tight">Servido</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  SuperAdmin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Gestión de Plataforma</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon size={19} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer / User info */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <Link
            href="/"
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink size={15} />
              <span>Ver Dashboard Restaurante</span>
            </div>
          </Link>

          <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between px-2">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-white truncate">{adminEmail || "SuperAdmin"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">Acceso Total</span>
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              title="Cerrar sesión"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Plataforma Servido</span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-bold text-slate-800">
                {navLinks.find(l => l.href === pathname)?.name || "SuperAdmin"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/70 rounded-full text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Servidor Operativo</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

