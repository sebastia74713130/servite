'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRestaurant } from '@/app/actions';

export function useRestaurantSession() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [branch, setBranch] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const userRest = await getUserRestaurant(session.user.id);
        
        if (!userRest || !userRest.restaurant || !userRest.restaurant.onboarding_completed) {
          router.push('/register/complete');
          return;
        }

        setRestaurant(userRest.restaurant);
        if (userRest.branch) setBranch(userRest.branch);
        if (userRest.role) setRole(userRest.role);
        if (userRest.billingCycle) setBillingCycle(userRest.billingCycle);
      } catch (e) {
        console.error('Session error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [router]);

  return { restaurant, branch, role, billingCycle, loading };
}

