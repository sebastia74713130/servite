"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Category } from "@shared/types";

export function useCategories(restaurantId: string | undefined, branchId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!restaurantId || !branchId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("branch_id", branchId)
      .order("sort_order", { ascending: true });

    if (data) setCategories(data as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [restaurantId, branchId]);

  return { categories, setCategories, loading, refetch: fetchCategories };
}
