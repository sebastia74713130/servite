"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@shared/types";

export function useDashboardStats(restaurantId: string | undefined, branchId?: string) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    nuevos: 0,
    nuevosTakeaway: 0,
    nuevosDineIn: 0,
    preparacion: 0,
    listos: 0,
    ventas: 0,
    productosVendidos: 0
  });

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch tables to identify takeaway vs salon tables
      let tablesQuery = supabase
        .from("tables")
        .select("id, type, table_number")
        .eq("restaurant_id", restaurantId);
      if (branchId) tablesQuery = tablesQuery.eq("branch_id", branchId);
      const { data: tablesData } = await tablesQuery;

      const takeawayTableIds = new Set(
        (tablesData || []).filter((t: any) => t.type === "takeaway").map((t: any) => t.id)
      );

      let query = supabase
        .from("orders")
        .select("id, status, total, created_at, is_paid, table_id, table_number, order_channel, customer_session_id, order_items(quantity)")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString());
      if (branchId) query = query.eq("branch_id", branchId);
      const { data: orders } = await query;

      if (orders) {
        const nuevos = new Set<string>();
        const nuevosTakeaway = new Set<string>();
        const nuevosDineIn = new Set<string>();
        const preparacion = new Set<string>();
        const listos = new Set<string>();
        let ventas = 0;
        let productosVendidos = 0;

        orders.forEach((o: any) => {
          // El contador de "Nuevos" en el sidebar debe reflejar lo que ve la cocina (OrdersPage)
          // La cocina agrupa por customer_session_id (takeaway) o table_id (dine-in)
          // Y no debe ignorar los pedidos pagados (is_paid = true), porque los de takeaway suelen llegar ya pagados
          const key = o.customer_session_id ? `session_${o.customer_session_id}` : `table_${o.table_id || o.id}`;

          const isTakeaway = 
            o.order_channel === "own_delivery" ||
            (o.table_id ? takeawayTableIds.has(o.table_id) : false) ||
            (o.table_number ? o.table_number.toUpperCase().startsWith("BARRA") : false);

          if (o.status === "sent" || o.status === "received") {
            nuevos.add(key);
            if (isTakeaway) {
              nuevosTakeaway.add(o.id ? `order_${o.id}` : key);
            } else {
              nuevosDineIn.add(o.table_id ? `table_${o.table_id}` : (o.id ? `order_${o.id}` : key));
            }
          }
          if (o.status === "preparing") preparacion.add(key);
          if (o.status === "ready") listos.add(key);

          // Sum all orders for total sales
          ventas += Number(o.total || 0);

          // Sum all order items quantity
          if (Array.isArray(o.order_items)) {
            o.order_items.forEach((item: any) => {
              productosVendidos += Number(item.quantity || 1);
            });
          }
        });
        setStats({ 
          nuevos: nuevos.size, 
          nuevosTakeaway: nuevosTakeaway.size,
          nuevosDineIn: nuevosDineIn.size,
          preparacion: preparacion.size, 
          listos: listos.size, 
          ventas,
          productosVendidos
        });
      }
      setLoading(false);
    }

    fetchStats();

    const channelOrders = supabase
      .channel(`dashboard_orders_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    const channelTables = supabase
      .channel(`dashboard_tables_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelOrders);
      supabase.removeChannel(channelTables);
    };
  }, [restaurantId, branchId]);

  return { stats, loading };
}
