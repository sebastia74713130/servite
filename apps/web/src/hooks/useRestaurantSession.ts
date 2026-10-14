'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRestaurant } from '@/app/actions';
import { isSuperAdmin } from '@/app/admin/actions';
import { ModuleKey } from '@/shared/types';

export function useRestaurantSession() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [branch, setBranch] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<any>(null);
  const [isMainBranch, setIsMainBranch] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Check if user has SuperAdmin platform privileges
        try {
          const superAdminStatus = await isSuperAdmin(session.user.id, session.user.email);
          setIsAdmin(superAdminStatus);
        } catch (err) {
          console.warn("Could not check superadmin status:", err);
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
        setIsMainBranch(userRest.isMainBranch ?? true);
      } catch (e) {
        console.error('Session error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [router]);

  const hasModule = useCallback((modKey: ModuleKey): boolean => {
    if (!restaurant) return false;
    const enabled = restaurant.enabled_modules;
    // Si no está definido (restaurantes previos), se asume habilitado para retrocompatibilidad
    if (!Array.isArray(enabled) || enabled.length === 0) return true;

    // Mesas y Cuentas (salón)
    if (modKey === 'accounts' || modKey === 'tables') {
      return (
        enabled.includes('accounts') ||
        enabled.includes('tables') ||
        enabled.includes('orders&accounts') ||
        enabled.includes('orders&acounts')
      );
    }

    // Pedidos (takeaway / barra)
    if (modKey === 'orders' || modKey === 'takeaway') {
      return (
        enabled.includes('orders') ||
        enabled.includes('takeaway') ||
        enabled.includes('orders&accounts') ||
        enabled.includes('orders&acounts')
      );
    }

    if (modKey === 'orders&accounts' || modKey === 'orders&acounts') {
      return (
        enabled.includes('orders&accounts') ||
        enabled.includes('orders&acounts') ||
        enabled.includes('accounts') ||
        enabled.includes('orders')
      );
    }

    return enabled.includes(modKey);
  }, [restaurant]);

  return { 
    restaurant, 
    branch, 
    role, 
    billingCycle, 
    loading, 
    isMainBranch,
    isAdmin,
    hasModule
  };
}
