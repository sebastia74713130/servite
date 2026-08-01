"use client";

import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { useOrders } from "@/hooks/useOrders";
import { useKitchenStations } from "@/hooks/useKitchenStations";
import { OrderCard } from "@/components/OrderCard";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList } from "lucide-react";
import { ORDER_STATUS_SEQUENCE } from "@shared/constants";

export default function OrdersPage() {
  const { restaurant, loading: sessionLoading } = useRestaurantSession();
  const { orders, loading: ordersLoading } = useOrders(restaurant?.id);
  const { stations, loading: stationsLoading } = useKitchenStations(restaurant?.id);

  if (sessionLoading || ordersLoading) return <LoadingState />;

  const columns = [
    { id: "received", name: "Recibidos", badgeClass: "bg-blue-100 text-blue-800" },
    { id: "preparing", name: "En preparación", badgeClass: "bg-orange-100 text-orange-800" },
    { id: "ready", name: "Listos para pedidos", badgeClass: "bg-green-100 text-green-800" },
    { id: "delivered", name: "Entregados", badgeClass: "bg-gray-100 text-gray-800" },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F2933]">Pedidos</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex-1 bg-white border border-[#E5E7EB] rounded-2xl flex items-center justify-center">
          <EmptyState 
            icon={ClipboardList} 
            title="No hay pedidos todavía" 
            subtitle="Los pedidos del día aparecerán aquí."
          />
        </div>
      ) : (
        <div className="flex-1 flex space-x-4 overflow-x-auto pb-4">
          {columns.map(col => {
            let columnOrders = orders.filter(o => {
              if (col.id === "received") return o.status === "sent" || o.status === "received";
              return o.status === col.id;
            });
            
            // Limit delivered orders so they don't pile up infinitely
            if (col.id === "delivered") {
              columnOrders = columnOrders.slice(0, 15);
            }
            
            const groupedOrders = Object.values(
              columnOrders.reduce((acc, order) => {
                if (!acc[order.table_id]) acc[order.table_id] = [];
                acc[order.table_id].push(order);
                return acc;
              }, {} as Record<string, typeof orders>)
            );

            return (
              <div key={col.id} className="w-80 flex-shrink-0 flex flex-col bg-[#F9FAFB] rounded-2xl p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <h2 className="font-bold text-[#1F2933]">{col.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeClass}`}>
                    {groupedOrders.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2">
                  {groupedOrders.map(tableOrders => (
                    <OrderCard 
                      key={tableOrders[0].id} 
                      orders={tableOrders} 
                      stations={stations}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
