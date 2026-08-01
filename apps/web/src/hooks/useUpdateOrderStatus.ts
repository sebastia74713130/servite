"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUpdateOrderStatus() {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (orderId: string, newStatus: string, restaurantId?: string) => {
    setLoading(true);
    const updatePayload: any = { status: newStatus };
    if (restaurantId) updatePayload.restaurant_id = restaurantId;

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);
    
    setLoading(false);
    return !error;
  };

  return { updateStatus, loading };
}
