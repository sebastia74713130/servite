"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { 
  Home, 
  ClipboardList, 
  ChefHat, 
  UtensilsCrossed, 
  LayoutGrid, 
  Settings,
  Receipt,
  LogOut,
  Wallet,
  Package
} from "lucide-react";

let globalUtterance: SpeechSynthesisUtterance | null = null;

export function Sidebar({ isOpen = true, setIsOpen }: { isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { restaurant } = useRestaurantSession();
  const { stats } = useDashboardStats(restaurant?.id);
  const [callingTablesCount, setCallingTablesCount] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  const prevNuevosRef = useRef(0);
  const prevCallingRef = useRef(0);

  useEffect(() => {
    const handleInteract = () => {
      setHasInteracted(true);
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };
    window.addEventListener('click', handleInteract);
    window.addEventListener('keydown', handleInteract);
    return () => {
      window.removeEventListener('click', handleInteract);
      window.removeEventListener('keydown', handleInteract);
    };
  }, []);

  const playSound = (type: 'order' | 'call' | 'ready') => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        let msg = 'Revisa tu panel de Servido.';
        let title = 'Notificación';
        if (type === 'order') title = '🍔 ¡Nuevo Pedido!';
        else if (type === 'call') title = '🛎️ ¡Llamado de Mesa!';
        else if (type === 'ready') title = '✅ ¡Pedido Listo!';
        
        new Notification(title, { body: msg });
      }

      if ('speechSynthesis' in window) {
        // Safe cancel to avoid Chrome bug where it gets permanently stuck
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        
        let speechText = '';
        if (type === 'order') speechText = 'Nuevo pedido';
        else if (type === 'call') speechText = 'Llamada en mesa';
        else if (type === 'ready') speechText = 'Pedido listo';

        globalUtterance = new SpeechSynthesisUtterance(speechText);
        globalUtterance.rate = 1.1;
        globalUtterance.lang = 'es-ES'; // Asegurar acento en español
        window.speechSynthesis.speak(globalUtterance);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Usaremos los eventos en tiempo real directamente para disparar las notificaciones, 
  // así aseguramos que cada botón presionado genere una alerta (incluso si el contador no sube).
  useEffect(() => {
    if (!restaurant?.id) return;

    const fetchCalling = async () => {
      const { data } = await supabase
        .from('tables')
        .select('service_status')
        .eq('restaurant_id', restaurant.id);
      
      const count = data?.filter(t => t.service_status !== null).length || 0;
      setCallingTablesCount(count);
    };

    fetchCalling();

    const channelTables = supabase
      .channel(`public:tables_sidebar_${Math.random()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        async (payload: any) => {
          fetchCalling();
          
          if (payload.eventType === 'UPDATE' && payload.new?.id) {
            // Fetch the full table row to guarantee we have all columns (restaurant_id, service_status)
            const { data } = await supabase
              .from('tables')
              .select('restaurant_id, service_status')
              .eq('id', payload.new.id)
              .single();
              
            if (data && data.restaurant_id === restaurant.id && data.service_status) {
              playSound('call');
            }
          }
        }
      )
      .subscribe();
      
      const channelOrders = supabase
      .channel(`public:orders_sidebar_${Math.random()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload: any) => {
          // Disparar sonido si entra un pedido nuevo (INSERT siempre trae toda la fila)
          if (payload.eventType === 'INSERT' && payload.new && payload.new.restaurant_id === restaurant.id) {
            playSound('order');
          }
          // Disparar sonido si cocina marca un pedido como listo
          if (payload.eventType === 'UPDATE' && payload.new?.id) {
            // Check if status changed to ready in payload, or if it was already ready
            // Fetch the full order row to guarantee we have restaurant_id
            const { data } = await supabase
              .from('orders')
              .select('restaurant_id, status')
              .eq('id', payload.new.id)
              .single();
              
            if (data && data.restaurant_id === restaurant.id && payload.new.status === 'ready') {
              playSound('ready');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelTables);
      supabase.removeChannel(channelOrders);
    };
  }, [restaurant?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const links = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Pedidos", href: "/orders", icon: ClipboardList },
    { name: "Cocina", href: "/kitchen", icon: ChefHat },
    { name: "Cuentas", href: "/accounts", icon: Receipt },
    { name: "Finanzas", href: "/finances", icon: Wallet },
    { name: "Inventario", href: "/inventory", icon: Package },
    { name: "Menú", href: "/menu", icon: UtensilsCrossed },
    { name: "Mesas", href: "/tables", icon: LayoutGrid },
    { name: "Configuración", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {!hasInteracted && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-500 text-white text-center py-2 font-bold cursor-pointer animate-pulse shadow-lg" onClick={() => setHasInteracted(true)}>
          ⚠️ Presiona aquí para activar los sonidos y notificaciones de voz en este navegador ⚠️
        </div>
      )}
      
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen?.(false)}
        />
      )}
      
      <div className={`w-64 bg-[#2F4F3E] shadow-[20px_0_40px_rgba(0,0,0,0.05)] flex flex-col h-screen fixed left-0 top-0 text-white z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-6">
        <h1 className="text-2xl font-bold">
          Servido<span className="text-[#E76F51]">.</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          
          let badgeCount = 0;
          if (link.name === "Pedidos") badgeCount = stats?.nuevos || 0;
          if (link.name === "Cuentas") badgeCount = callingTablesCount;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen?.(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon size={20} />
                <span>{link.name}</span>
              </div>
              
              {badgeCount > 0 && (
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold h-5 min-w-[20px] px-1.5 rounded-full shadow-md">
                    {badgeCount}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
      </div>
      </div>
    </>
  );
}
