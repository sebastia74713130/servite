"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@shared/types";

// Module-level global cache for instant hydration across pages
const ordersCache = new Map<string, Order[]>();

export function useOrders(
  restaurantId: string | undefined,
  branchId?: string,
  options: { onlyUnpaid?: boolean } = { onlyUnpaid: false }
) {
  const cacheKey = restaurantId
    ? `${restaurantId}_${branchId || "all"}_${Boolean(options.onlyUnpaid)}`
    : null;

  const initialOrders = cacheKey ? ordersCache.get(cacheKey) || [] : [];
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState<boolean>(!cacheKey || !ordersCache.has(cacheKey));

  // If cacheKey changes or cached data exists, sync state
  useEffect(() => {
    if (cacheKey && ordersCache.has(cacheKey)) {
      setOrders(ordersCache.get(cacheKey)!);
      setLoading(false);
    }
  }, [cacheKey]);

  const fetchOrders = useCallback(
    async (isSilent = false) => {
      if (!restaurantId || !cacheKey) return;

      if (!isSilent && !ordersCache.has(cacheKey)) {
        setLoading(true);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (branchId) query = query.eq("branch_id", branchId);

      if (options.onlyUnpaid) {
        query = query.eq("is_paid", false).neq("status", "cancelled");
      } else {
        query = query.gte("created_at", today.toISOString());
      }

      const { data, error } = await query;

      if (!error && data) {
        const fetchedOrders = data as Order[];
        ordersCache.set(cacheKey, fetchedOrders);
        setOrders(fetchedOrders);
      }
      setLoading(false);
    },
    [restaurantId, branchId, options.onlyUnpaid, cacheKey]
  );

  useEffect(() => {
    // Stale-while-revalidate: if we already have cache, fetch in background silently
    const hasCache = cacheKey && ordersCache.has(cacheKey);
    fetchOrders(Boolean(hasCache));

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
          fetchOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, restaurantId, cacheKey]);

  return { orders, loading, refreshOrders: () => fetchOrders(true) };
}
