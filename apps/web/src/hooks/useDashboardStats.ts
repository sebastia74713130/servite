"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@shared/types";

export function useDashboardStats(restaurantId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    nuevos: 0,
    preparacion: 0,
    listos: 0,
    ventas: 0
  });

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from("orders")
        .select("status, total, created_at, is_paid, table_id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString());

      if (orders) {
        const nuevos = new Set<string>();
        const preparacion = new Set<string>();
        const listos = new Set<string>();
        let ventas = 0;

        orders.forEach((o: any) => {
          if (!o.is_paid) {
            if (o.status === "sent") nuevos.add(o.table_id);
            if (o.status === "preparing") preparacion.add(o.table_id);
            if (o.status === "ready") listos.add(o.table_id);
          }
          // Sum all orders for total sales
          ventas += Number(o.total || 0);
        });
        setStats({ 
          nuevos: nuevos.size, 
          preparacion: preparacion.size, 
          listos: listos.size, 
          ventas 
        });
      }
      setLoading(false);
    }

    fetchStats();

    const channel = supabase
      .channel(`dashboard_changes_${Date.now()}`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return { stats, loading };
}
