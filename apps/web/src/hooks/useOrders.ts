"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@shared/types";

export function useOrders(restaurantId: string | undefined, options: { onlyUnpaid?: boolean } = { onlyUnpaid: false }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!restaurantId) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("restaurant_id", restaurantId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    if (options.onlyUnpaid) {
      query = query.eq("is_paid", false);
    }

    const { data, error } = await query;

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    if (!restaurantId) return;

    // Realtime subscription
    const channel = supabase
      .channel(`orders_changes_${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return { orders, loading };
}
