import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Reservation {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  table?: {
    table_number: string;
    table_code: string;
  } | null;
}

export function useReservations(restaurantId?: string, dateFilter?: string) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);

    let query = supabase
      .from('reservations')
      .select('*, table:tables(table_number, table_code)')
      .eq('restaurant_id', restaurantId)
      .order('reservation_time', { ascending: true });

    if (dateFilter) {
      query = query.eq('reservation_date', dateFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reservations:', error);
    } else {
      setReservations((data as Reservation[]) || []);
    }

    setLoading(false);
  }, [restaurantId, dateFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`public:reservations_${restaurantId}_${Math.random()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload: any) => {
          // Only refetch if the reservation belongs to this restaurant
          if (
            payload.new?.restaurant_id === restaurantId ||
            payload.old?.restaurant_id === restaurantId
          ) {
            fetchReservations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchReservations]);

  return { reservations, loading, refetch: fetchReservations };
}
