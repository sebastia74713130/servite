"use client";

import { useState } from "react";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { useOrders } from "@/hooks/useOrders";
import { useKitchenStations } from "@/hooks/useKitchenStations";
import { KitchenOrderCard } from "@/components/KitchenOrderCard";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { ArrowLeft, ChefHat } from "lucide-react";

export default function KitchenPage() {
  const { restaurant, loading: sessionLoading } = useRestaurantSession();
  const { orders, loading: ordersLoading } = useOrders(restaurant?.id);
  const { stations, loading: stationsLoading } = useKitchenStations(restaurant?.id);
  const [selectedStationId, setSelectedStationId] = useState<string>("all");

  if (sessionLoading || ordersLoading || stationsLoading) return <LoadingState />;

  // Filter orders to only show those that have items for the selected station
  // If no station is selected ("all"), show all active orders
  const activeOrders = orders.filter(o => {
    if (!["sent", "received", "preparing"].includes(o.status)) return false;
    if (selectedStationId === "all") return true;
    
    // Check if the order has any item for this station or a null station (general)
    return o.order_items?.some((item: any) => item.station_id === selectedStationId || item.station_id === null);
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 flex items-center justify-center bg-white border border-[#E5E7EB] rounded-full text-[#6B7280] hover:text-[#1F2933] hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-[#1F2933]">Cocina</h1>
        </div>
        <div className="flex items-center space-x-2 text-[#2E7D32] bg-[#EDF7ED] px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
          <span className="font-semibold text-sm">Sincronizado en tiempo real</span>
        </div>
      </div>

      {stations.length > 0 && (
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedStationId("all")}
            className={`px-4 py-2 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedStationId === "all"
                ? "bg-[#1F2933] text-white"
                : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50"
            }`}
          >
            Todas
          </button>
          {stations.map(station => (
            <button
              key={station.id}
              onClick={() => setSelectedStationId(station.id)}
              className={`px-4 py-2 rounded-full font-medium transition-colors whitespace-nowrap ${
                selectedStationId === station.id
                  ? "bg-[#1F2933] text-white"
                  : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50"
              }`}
            >
              {station.name}
            </button>
          ))}
        </div>
      )}

      {activeOrders.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl flex items-center justify-center py-20 mt-10">
          <EmptyState 
            icon={ChefHat} 
            title="La cocina está tranquila" 
            subtitle="Los pedidos aparecerán aquí cuando los clientes escaneen el QR y ordenen."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.map(order => (
            <KitchenOrderCard 
              key={order.id} 
              order={order} 
              stationId={selectedStationId === "all" ? undefined : selectedStationId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
