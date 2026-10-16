"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { updateOrderStatusAction } from "@/app/actions";

export function useUpdateOrderStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (
    orderId: string, 
    newStatus: string, 
    restaurantId?: string,
    extraPayload?: Record<string, any>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // 1. Intentar mediante Server Action con permisos administrativos
      const result = await updateOrderStatusAction(orderId, newStatus, extraPayload);
      if (result.success) {
        setLoading(false);
        return true;
      }
      
      console.warn("Server action failed, falling back to client update:", result.error);

      // 2. Fallback a cliente Supabase
      const updatePayload: any = { 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        ...(extraPayload || {}) 
      };

      const { error: clientError } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId);

      if (clientError) {
        console.error("Client Supabase update error:", clientError);
        setError(clientError.message);
        setLoading(false);
        return false;
      }

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error("Error updating order status:", err);
      setError(err.message || "Error desconocido");
      setLoading(false);
      return false;
    }
  };

  return { updateStatus, loading, error };
}

