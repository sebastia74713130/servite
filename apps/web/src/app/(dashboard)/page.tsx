"use client";

import Link from "next/link";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { DashboardCard } from "@/components/DashboardCard";
import { LoadingState } from "@/components/LoadingState";
import { formatPrice } from "@shared/utils";
import { Inbox, Flame, CheckCircle, DollarSign, ChefHat, Receipt, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { restaurant, loading: sessionLoading } = useRestaurantSession();
  const { stats, loading: statsLoading } = useDashboardStats(restaurant?.id);
  const [callingTablesCount, setCallingTablesCount] = useState(0);

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
  }, [restaurant?.id]);

  if (sessionLoading || statsLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2933]">Dashboard</h1>
        <p className="text-[#6B7280]">Resumen del día en {restaurant?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Pedidos nuevos" 
          value={stats.nuevos} 
          icon={Inbox} 
          badgeColor="blue" 
        />
        <DashboardCard 
          title="En preparación" 
          value={stats.preparacion} 
          icon={Flame} 
          badgeColor="terracotta" 
        />
        <DashboardCard 
          title="Listos" 
          value={stats.listos} 
          icon={CheckCircle} 
          badgeColor="green" 
        />
        <DashboardCard 
          title="Ventas del día" 
          value={formatPrice(stats.ventas)} 
          icon={DollarSign} 
          badgeColor="gold" 
        />
      </div>

      <div className="pt-8">
        <h2 className="text-xl font-bold text-[#1F2933] mb-6">Acceso rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pedidos */}
          <Link href="/orders" className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 hover:bg-[#F9FAFB] transition-colors cursor-pointer group shadow-sm relative">
            {stats.nuevos > 0 && (
              <div className="absolute top-4 right-4 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold h-6 min-w-[24px] px-2 rounded-full shadow-md">
                  {stats.nuevos}
                </span>
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList size={32} className="text-[#3B82F6]" />
            </div>
            <span className="font-bold text-[#1F2933]">Ver Pedidos</span>
          </Link>

          {/* Cocina */}
          <Link href="/kitchen" className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 hover:bg-[#F9FAFB] transition-colors cursor-pointer group shadow-sm relative">
            {(stats.preparacion > 0 || stats.listos > 0) && (
              <div className="absolute top-4 right-4 flex items-center justify-center">
                <span className="relative inline-flex items-center justify-center bg-orange-500 text-white text-xs font-bold h-6 min-w-[24px] px-2 rounded-full shadow-md">
                  {stats.preparacion + stats.listos}
                </span>
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-[#FDF0EC] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChefHat size={32} className="text-[#E76F51]" />
            </div>
            <span className="font-bold text-[#1F2933]">Ver Cocina</span>
          </Link>
          
          {/* Cuentas */}
          <Link href="/accounts" className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 hover:bg-[#F9FAFB] transition-colors cursor-pointer group shadow-sm relative">
            {callingTablesCount > 0 && (
              <div className="absolute top-4 right-4 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold h-6 min-w-[24px] px-2 rounded-full shadow-md">
                  {callingTablesCount}
                </span>
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-[#EDF7ED] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt size={32} className="text-[#2E7D32]" />
            </div>
            <span className="font-bold text-[#1F2933]">Ver Cuentas</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
