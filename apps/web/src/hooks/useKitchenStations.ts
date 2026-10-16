'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KitchenStation } from '@shared/types';

// Module-level cache for kitchen stations
const stationsCache = new Map<string, KitchenStation[]>();

export function useKitchenStations(restaurantId?: string, branchId?: string) {
  const cacheKey = restaurantId ? `${restaurantId}_${branchId || 'all'}` : null;
  const initialStations = cacheKey ? stationsCache.get(cacheKey) || [] : [];
  const [stations, setStations] = useState<KitchenStation[]>(initialStations);
  const [loading, setLoading] = useState<boolean>(!cacheKey || !stationsCache.has(cacheKey));

  const fetchStations = useCallback(async (isSilent = false) => {
    if (!restaurantId || !cacheKey) {
      setLoading(false);
      return;
    }

    if (!isSilent && !stationsCache.has(cacheKey)) {
      setLoading(true);
    }

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
      const fetched = data as KitchenStation[];
      stationsCache.set(cacheKey, fetched);
      setStations(fetched);
    } else if (error) {
      console.error('Error fetching kitchen stations:', error);
    }
    setLoading(false);
  }, [restaurantId, branchId, cacheKey]);

  useEffect(() => {
    const hasCache = cacheKey && stationsCache.has(cacheKey);
    fetchStations(Boolean(hasCache));
  }, [fetchStations, cacheKey]);

  return { stations, loading, refetch: () => fetchStations(true) };
}
