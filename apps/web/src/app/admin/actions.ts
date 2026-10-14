"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { ModuleKey, PlatformAdmin, AVAILABLE_MODULES, CANONICAL_MODULE_KEYS } from "@/shared/types";

// Valida si un usuario específico tiene privilegios de SuperAdmin de la plataforma
export async function isSuperAdmin(userId: string, email?: string): Promise<boolean> {
  if (!userId) return false;

  const superadminEmails = (process.env.SUPERADMIN_EMAILS || "admin@servido.app")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (email && superadminEmails.includes(email.toLowerCase())) {
    return true;
  }

  try {
    const { data } = await supabaseAdmin
      .from("platform_admins")
      .select("id, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1);

    if (data && data.length > 0) return true;
  } catch (err) {
    console.warn("Could not query platform_admins table:", err);
  }

  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userData?.user?.email && superadminEmails.includes(userData.user.email.toLowerCase())) {
      return true;
    }
  } catch (err) {
    console.warn("Could not query auth.admin.getUserById:", err);
  }

  return false;
}

// Obtiene métricas generales de toda la plataforma Servido
export async function getPlatformMetrics() {
  const { data: restaurants, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, subscription_status, subscription_expires_at, monthly_price, enabled_modules, created_at");

  if (error) {
    console.error("Error fetching platform metrics:", error);
    throw new Error(error.message);
  }

  const all = restaurants || [];
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const totalRestaurants = all.length;
  const activeRestaurants = all.filter(r => r.subscription_status === "active").length;
  const expiredRestaurants = all.filter(r => 
    r.subscription_status === "expired" || 
    (r.subscription_expires_at && new Date(r.subscription_expires_at) < now)
  ).length;

  const soonToExpire = all.filter(r => {
    if (r.subscription_status !== "active" || !r.subscription_expires_at) return false;
    const exp = new Date(r.subscription_expires_at);
    return exp >= now && exp <= in7Days;
  });

  const estimatedMrr = all.reduce((sum, r) => {
    if (r.subscription_status === "active") {
      return sum + Number(r.monthly_price || 0);
    }
    return sum;
  }, 0);

  // Módulos más contratados (normalizados a los 9 módulos canónicos)
  const moduleCounts: Record<string, number> = {};
  Object.keys(AVAILABLE_MODULES).forEach(key => {
    moduleCounts[key] = 0;
  });

  all.forEach(r => {
    const rawModules = Array.isArray(r.enabled_modules) ? r.enabled_modules : [];
    const normalizedMods = new Set<string>();

    rawModules.forEach((mod: string) => {
      if (mod === 'tables' || mod === 'orders&accounts' || mod === 'orders&acounts' || mod === 'accounts') {
        normalizedMods.add('accounts');
      } else if (mod === 'takeaway' || mod === 'orders') {
        normalizedMods.add('orders');
      } else if (AVAILABLE_MODULES[mod as keyof typeof AVAILABLE_MODULES]) {
        normalizedMods.add(mod);
      }
    });

    normalizedMods.forEach((mod: string) => {
      if (moduleCounts[mod] !== undefined) {
        moduleCounts[mod]++;
      }
    });
  });

  return {
    totalRestaurants,
    activeRestaurants,
    expiredRestaurants,
    soonToExpireCount: soonToExpire.length,
    soonToExpire,
    estimatedMrr,
    moduleCounts,
    recentRestaurants: all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
  };
}

// Obtiene el listado de todos los restaurantes con sus usuarios dueños y sucursales
export async function getAdminRestaurants(filters?: {
  search?: string;
  status?: string;
  module?: string;
}) {
  let query = supabaseAdmin
    .from("restaurants")
    .select(`
      id,
      name,
      slug,
      logo_url,
      phone,
      address,
      city,
      is_active,
      subscription_plan,
      subscription_status,
      subscription_expires_at,
      subscription_notes,
      monthly_price,
      billing_period,
      enabled_modules,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("subscription_status", filters.status);
  }

  const { data: restaurants, error } = await query;
  if (error) throw new Error(error.message);

  let list = restaurants || [];

  // Filtro de texto por búsqueda
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.toLowerCase().trim();
    list = list.filter(r => 
      r.name?.toLowerCase().includes(s) || 
      r.slug?.toLowerCase().includes(s) || 
      r.city?.toLowerCase().includes(s) ||
      r.phone?.toLowerCase().includes(s)
    );
  }

  // Filtro por módulo activo (reconociendo llaves canónicas y legadas)
  if (filters?.module && filters.module !== "all") {
    const target = filters.module;
    list = list.filter(r => {
      const rawMods = Array.isArray(r.enabled_modules) ? r.enabled_modules : [];
      if (target === 'accounts') {
        return rawMods.some(m => m === 'accounts' || m === 'tables' || m === 'orders&accounts' || m === 'orders&acounts');
      }
      if (target === 'orders') {
        return rawMods.some(m => m === 'orders' || m === 'takeaway');
      }
      return rawMods.includes(target);
    });
  }

  // Enriquecer con conteo de sucursales e información de dueños
  const restaurantIds = list.map(r => r.id);
  if (restaurantIds.length === 0) return [];

  const [{ data: branches }, { data: restUsers }] = await Promise.all([
    supabaseAdmin.from("branches").select("id, restaurant_id").in("restaurant_id", restaurantIds),
    supabaseAdmin.from("restaurant_users").select("restaurant_id, role, user_id").in("restaurant_id", restaurantIds).eq("role", "owner")
  ]);

  const branchCountMap: Record<string, number> = {};
  (branches || []).forEach(b => {
    branchCountMap[b.restaurant_id] = (branchCountMap[b.restaurant_id] || 0) + 1;
  });

  const ownerUserIds = (restUsers || []).map(ru => ru.user_id);
  const ownerEmailMap: Record<string, string> = {};
  
  if (ownerUserIds.length > 0) {
    try {
      // Obtenemos los correos de los dueños desde auth
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      (users || []).forEach(u => {
        if (u.email) ownerEmailMap[u.id] = u.email;
      });
    } catch (err) {
      console.warn("Could not list auth users for owner emails:", err);
    }
  }

  const ownerByRestMap: Record<string, string> = {};
  (restUsers || []).forEach(ru => {
    if (ownerEmailMap[ru.user_id]) {
      ownerByRestMap[ru.restaurant_id] = ownerEmailMap[ru.user_id];
    }
  });

  return list.map(r => ({
    ...r,
    branches_count: branchCountMap[r.id] || 0,
    owner_email: ownerByRestMap[r.id] || "No registrado",
    enabled_modules: Array.isArray(r.enabled_modules) ? r.enabled_modules : [...CANONICAL_MODULE_KEYS]
  }));
}

// Actualiza los datos de suscripción de un restaurante
export async function updateRestaurantSubscription(
  restaurantId: string,
  payload: {
    plan?: string;
    status?: 'active' | 'inactive' | 'expired' | 'suspended';
    expires_at?: string | null;
    monthly_price?: number;
    billing_period?: 'monthly' | 'semiannual' | 'annual';
    notes?: string | null;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (payload.plan !== undefined) updateData.subscription_plan = payload.plan;
  if (payload.status !== undefined) updateData.subscription_status = payload.status;
  if (payload.expires_at !== undefined) updateData.subscription_expires_at = payload.expires_at;
  if (payload.monthly_price !== undefined) updateData.monthly_price = payload.monthly_price;
  if (payload.billing_period !== undefined) updateData.billing_period = payload.billing_period;
  if (payload.notes !== undefined) updateData.subscription_notes = payload.notes;

  const { error } = await supabaseAdmin
    .from("restaurants")
    .update(updateData)
    .eq("id", restaurantId);

  if (error) throw new Error(error.message);
  return { success: true };
}

// Actualiza de forma atómica tanto la suscripción como los módulos habilitados para un restaurante
export async function updateRestaurantFullDetails(
  restaurantId: string,
  payload: {
    enabled_modules?: (ModuleKey | string)[];
    plan?: string;
    status?: 'active' | 'inactive' | 'expired' | 'suspended';
    expires_at?: string | null;
    monthly_price?: number;
    billing_period?: 'monthly' | 'semiannual' | 'annual';
    notes?: string | null;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (payload.enabled_modules !== undefined) {
    const normalized = Array.from(new Set(
      payload.enabled_modules.map(m => {
        if (m === 'tables' || m === 'orders&accounts' || m === 'orders&acounts') return 'accounts';
        if (m === 'takeaway') return 'orders';
        return m;
      })
    ));
    updateData.enabled_modules = normalized;
  }

  if (payload.plan !== undefined) updateData.subscription_plan = payload.plan;
  if (payload.status !== undefined) updateData.subscription_status = payload.status;
  if (payload.expires_at !== undefined) updateData.subscription_expires_at = payload.expires_at;
  if (payload.monthly_price !== undefined) updateData.monthly_price = payload.monthly_price;
  if (payload.billing_period !== undefined) updateData.billing_period = payload.billing_period;
  if (payload.notes !== undefined) updateData.subscription_notes = payload.notes;

  const { error } = await supabaseAdmin
    .from("restaurants")
    .update(updateData)
    .eq("id", restaurantId);

  if (error) throw new Error(error.message);
  return { success: true };
}

// Actualiza de forma atómica los módulos habilitados para un restaurante (guardando siempre claves canónicas)
export async function updateRestaurantModules(restaurantId: string, enabledModules: (ModuleKey | string)[]) {
  const normalized = Array.from(new Set(
    enabledModules.map(m => {
      if (m === 'tables' || m === 'orders&accounts' || m === 'orders&acounts') return 'accounts';
      if (m === 'takeaway') return 'orders';
      return m;
    })
  ));

  const { error } = await supabaseAdmin
    .from("restaurants")
    .update({
      enabled_modules: normalized,
      updated_at: new Date().toISOString()
    })
    .eq("id", restaurantId);

  if (error) throw new Error(error.message);
  return { success: true };
}

// Activa o suspende el acceso total a un restaurante
export async function toggleRestaurantActive(restaurantId: string, isActive: boolean) {
  const { error } = await supabaseAdmin
    .from("restaurants")
    .update({
      is_active: isActive,
      subscription_status: isActive ? "active" : "suspended",
      updated_at: new Date().toISOString()
    })
    .eq("id", restaurantId);

  if (error) throw new Error(error.message);
  return { success: true };
}

// Obtiene la lista de administradores de la plataforma
export async function getPlatformAdmins(): Promise<PlatformAdmin[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("platform_admins")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as PlatformAdmin[];
  } catch (err: any) {
    console.warn("Could not fetch platform admins:", err.message);
    return [];
  }
}

// Agrega un nuevo administrador de la plataforma por correo electrónico
export async function addPlatformAdmin(email: string, fullName?: string) {
  const cleanEmail = email.trim().toLowerCase();
  
  // Buscar usuario en auth.users
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new Error(listError.message);

  const targetUser = users.find(u => u.email?.toLowerCase() === cleanEmail);
  if (!targetUser) {
    throw new Error(`No se encontró ningún usuario registrado con el correo ${cleanEmail}. El usuario debe registrarse primero en Servido.`);
  }

  const { error } = await supabaseAdmin
    .from("platform_admins")
    .upsert({
      user_id: targetUser.id,
      email: cleanEmail,
      full_name: fullName || targetUser.user_metadata?.full_name || null,
      role: "superadmin",
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
  return { success: true };
}

// Elimina o desactiva un administrador de la plataforma
export async function removePlatformAdmin(adminId: string) {
  const { error } = await supabaseAdmin
    .from("platform_admins")
    .delete()
    .eq("id", adminId);

  if (error) throw new Error(error.message);
  return { success: true };
}

