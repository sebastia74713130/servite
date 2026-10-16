'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRestaurant } from '@/app/actions';
import { isSuperAdmin } from '@/app/admin/actions';
import { ModuleKey } from '@/shared/types';

export interface RestaurantSessionContextType {
  restaurant: any;
  branch: any;
  role: string | null;
  billingCycle: any;
  loading: boolean;
  isMainBranch: boolean;
  isAdmin: boolean;
  hasModule: (modKey: ModuleKey) => boolean;
  refreshSession: () => Promise<void>;
}

export const RestaurantSessionContext = createContext<RestaurantSessionContextType | null>(null);

// Module-level cache to keep session in memory across fast remounts / hydration
let cachedSessionData: {
  restaurant: any;
  branch: any;
  role: string | null;
  billingCycle: any;
  isMainBranch: boolean;
  isAdmin: boolean;
} | null = null;

export function RestaurantSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(cachedSessionData?.restaurant || null);
  const [branch, setBranch] = useState<any>(cachedSessionData?.branch || null);
  const [role, setRole] = useState<string | null>(cachedSessionData?.role || null);
  const [billingCycle, setBillingCycle] = useState<any>(cachedSessionData?.billingCycle || null);
  const [isMainBranch, setIsMainBranch] = useState<boolean>(cachedSessionData?.isMainBranch ?? true);
  const [isAdmin, setIsAdmin] = useState<boolean>(cachedSessionData?.isAdmin ?? false);
  const [loading, setLoading] = useState<boolean>(!cachedSessionData);

  const loadSession = useCallback(async (isRefresh = false) => {
    if (!cachedSessionData && !isRefresh) {
      setLoading(true);
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      let superAdminStatus = false;
      try {
        superAdminStatus = await isSuperAdmin(session.user.id, session.user.email);
        setIsAdmin(superAdminStatus);
      } catch (err) {
        console.warn("Could not check superadmin status:", err);
      }

      const userRest = await getUserRestaurant(session.user.id);

      if (!userRest || !userRest.restaurant || !userRest.restaurant.onboarding_completed) {
        router.push('/register/complete');
        return;
      }

      const newRest = userRest.restaurant;
      const newBranch = userRest.branch || null;
      const newRole = userRest.role || null;
      const newBillingCycle = userRest.billingCycle || null;
      const newIsMainBranch = userRest.isMainBranch ?? true;

      cachedSessionData = {
        restaurant: newRest,
        branch: newBranch,
        role: newRole,
        billingCycle: newBillingCycle,
        isMainBranch: newIsMainBranch,
        isAdmin: superAdminStatus,
      };

      setRestaurant(newRest);
      setBranch(newBranch);
      setRole(newRole);
      setBillingCycle(newBillingCycle);
      setIsMainBranch(newIsMainBranch);
    } catch (e) {
      console.error('Session error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

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

  const value = useMemo<RestaurantSessionContextType>(() => ({
    restaurant,
    branch,
    role,
    billingCycle,
    loading,
    isMainBranch,
    isAdmin,
    hasModule,
    refreshSession: () => loadSession(true),
  }), [restaurant, branch, role, billingCycle, loading, isMainBranch, isAdmin, hasModule, loadSession]);

  return (
    <RestaurantSessionContext.Provider value={value}>
      {children}
    </RestaurantSessionContext.Provider>
  );
}

export function useRestaurantSessionContext() {
  return useContext(RestaurantSessionContext);
}

