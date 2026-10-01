'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { KitchenStation } from '@shared/types';

export function useKitchenStations(restaurantId?: string, branchId?: string) {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from('kitchen_stations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setStations(data as KitchenStation[]);
    } else {
      console.error('Error fetching kitchen stations:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStations();
  }, [restaurantId, branchId]);

  return { stations, loading, refetch: fetchStations };
}
