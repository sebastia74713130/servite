"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { usePathname } from "next/navigation";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { LoadingState } from "@/components/LoadingState";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isKitchen = pathname === "/kitchen";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { loading, restaurant, billingCycle } = useRestaurantSession();

  if (isKitchen) {
    return <div className="min-h-screen bg-[#F9FAFB]">{children}</div>;
  }

  if (loading) {
    return <LoadingState />;
  }

  // Si no está cargando pero no hay restaurante, el hook useRestaurantSession ya se encarga de redirigir
  // pero podemos retornar null para no renderizar el layout en el ínterin.
  if (!restaurant) {
    return null;
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
