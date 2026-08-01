"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useSubsections(categoryIds: string[]) {
  const [subsections, setSubsections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubsections = async () => {
    if (!categoryIds || categoryIds.length === 0) {
      setSubsections([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await supabase
      .from("subsections")
      .select("*")
      .in("category_id", categoryIds)
      .order("sort_order", { ascending: true });

    if (data) setSubsections(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubsections();
  }, [JSON.stringify(categoryIds)]);

  return { subsections, setSubsections, loading, refetch: fetchSubsections };
}
