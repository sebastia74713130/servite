"use client";

import { useState, useEffect } from "react";
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

  // Allow kitchen to manually dismiss delivered orders
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kitchen_hidden_orders');
      if (saved) setHiddenKeys(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const handleHideCard = (key: string) => {
    const newHidden = [...hiddenKeys, key];
    setHiddenKeys(newHidden);
    try {
      // Keep only last 100 to prevent localstorage bloat
      localStorage.setItem('kitchen_hidden_orders', JSON.stringify(newHidden.slice(-100)));
    } catch (e) {}
  };

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
            
            const groupedMap = columnOrders.reduce((acc, order) => {
              // Group by session ID if it exists, otherwise fallback to table_id
              // This ensures takeaway orders from different customers aren't merged into one giant card
              const key = order.customer_session_id ? `session_${order.customer_session_id}` : `table_${order.table_id}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(order);
              return acc;
            }, {} as Record<string, typeof orders>);

            let groupedOrders = Object.entries(groupedMap)
              .filter(([key]) => !hiddenKeys.includes(key))
              .map(([, groupOrders]) => groupOrders);
            
            // Limit delivered cards so they don't pile up infinitely and slow down the browser
            if (col.id === "delivered") {
              groupedOrders = groupedOrders.slice(0, 15);
            }

            return (
              <div key={col.id} className="w-80 flex-shrink-0 flex flex-col bg-[#F9FAFB] rounded-2xl p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <h2 className="font-bold text-[#1F2933]">{col.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeClass}`}>
                    {groupedOrders.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2">
                  {groupedOrders.map(tableOrders => {
                    const order = tableOrders[0];
                    const key = order.customer_session_id ? `session_${order.customer_session_id}` : `table_${order.table_id}`;
                    return (
                      <OrderCard 
                        key={key} 
                        orders={tableOrders} 
                        stations={stations}
                        onDismiss={col.id === "delivered" ? () => handleHideCard(key) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
