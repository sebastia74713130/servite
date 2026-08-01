'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { KitchenStation } from '@shared/types';

export function useKitchenStations(restaurantId: string | undefined) {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('kitchen_stations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setStations(data as KitchenStation[]);
    } else {
      console.error('Error fetching kitchen stations:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStations();
  }, [restaurantId]);

  return { stations, loading, refetch: fetchStations };
}
