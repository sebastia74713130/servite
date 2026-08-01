"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@shared/types";

export function useProducts(restaurantId: string | undefined, branchId: string | undefined, categoryId?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    if (!restaurantId || !branchId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("branch_id", branchId)
      .order("sort_order", { ascending: true });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data } = await query;

    if (data) setProducts(data as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [restaurantId, branchId, categoryId]);

  return { products, setProducts, loading, refetch: fetchProducts };
}
