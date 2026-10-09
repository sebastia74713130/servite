'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RestaurantTable } from '@shared/types';

export function useTables(restaurantId: string | undefined, branchId: string | undefined) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    if (!restaurantId || !branchId) return;

    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('branch_id', branchId)
      .order('table_number', { ascending: true });

    if (data) {
      // Auto-migrar mesas tipo takeaway que tengan prefijo antiguo MESA- a BARRA-
      const takeawayToMigrate = data.filter(t => t.type === 'takeaway' && t.table_code?.startsWith('MESA-'));
      if (takeawayToMigrate.length > 0) {
        for (const t of takeawayToMigrate) {
          const newCode = t.table_code.replace('MESA-', 'BARRA-');
          await supabase.from('tables').update({ table_code: newCode }).eq('id', t.id);
          t.table_code = newCode;
        }
      }
      setTables(data as RestaurantTable[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTables();
  }, [restaurantId, branchId]);

  return { tables, loading, refetch: fetchTables };
}
