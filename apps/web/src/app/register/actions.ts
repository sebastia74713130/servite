"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
    .replace(/(^-|-$)+/g, ""); // Remove leading/trailing dashes
}

export async function setupNewRestaurant(userId: string, email: string, restaurantName: string) {
  if (!restaurantName) return { error: "El nombre del restaurante es requerido" };

  const baseSlug = generateSlug(restaurantName);
  let slug = baseSlug;
  
  // Ensure slug uniqueness
  let isUnique = false;
  let counter = 1;
  while (!isUnique) {
    const { data: existing, error: slugError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
      
    if (slugError) {
      console.error("Error checking slug:", slugError);
      return { error: "Error de conexión al verificar restaurante" };
    }
      
    if (!existing) {
      isUnique = true;
    } else {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // 1. Create Restaurant
  const { data: restaurant, error: restError } = await supabaseAdmin
    .from('restaurants')
    .insert({
      name: restaurantName,
      slug: slug,
      is_active: true,
    })
    .select()
    .single();

  if (restError || !restaurant) {
    console.error("Error creating restaurant:", restError);
    return { error: "No se pudo crear el restaurante: " + (restError?.message || "Desconocido") };
  }

  // 2. Create Main Branch
  const { data: branch, error: branchError } = await supabaseAdmin
    .from('branches')
    .insert({
      restaurant_id: restaurant.id,
      name: 'Principal',
      is_active: true,
    })
    .select()
    .single();

  if (branchError || !branch) {
    console.error("Error creating branch:", branchError);
    return { error: "No se pudo crear la sucursal" };
  }

  // 3. Link User to Restaurant as Owner
  const { error: linkError } = await supabaseAdmin
    .from('restaurant_users')
    .insert({
      restaurant_id: restaurant.id,
      user_id: userId,
      role: 'owner',
    });

  if (linkError) {
    console.error("Error linking user:", linkError);
    return { error: "No se pudo vincular el usuario al restaurante" };
  }

  return { success: true, restaurantId: restaurant.id, branchId: branch.id };
}

export async function updateBranding(restaurantId: string, logoUrl: string, coverUrl: string, primaryColor: string) {
  const updates: any = {};
  if (logoUrl) updates.logo_url = logoUrl;
  if (coverUrl) updates.cover_url = coverUrl;
  if (primaryColor) updates.primary_color = primaryColor;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from('restaurants')
      .update(updates)
      .eq('id', restaurantId);

    if (error) {
      console.error("Supabase Error updating branding:", error);
      return { error: `Error DB: ${error.message}` };
    }
  }
  return { success: true };
}

export async function createInitialMenu(restaurantId: string, branchId: string, categoryName: string, productName: string, price: number) {
  // Create category
  const { data: category, error: catError } = await supabaseAdmin
    .from('categories')
    .insert({
      restaurant_id: restaurantId,
      branch_id: branchId,
      name: categoryName,
      is_active: true
    })
    .select()
    .single();

  if (catError || !category) return { error: "Error creando categoría" };

  // Create product
  const { error: prodError } = await supabaseAdmin
    .from('products')
    .insert({
      restaurant_id: restaurantId,
      branch_id: branchId,
      category_id: category.id,
      name: productName,
      price: price,
      is_active: true,
      is_available: true
    });

  if (prodError) return { error: "Error creando producto" };

  return { success: true };
}

export async function completeOnboarding(restaurantId: string) {
  const { error } = await supabaseAdmin
    .from('restaurants')
    .update({ onboarding_completed: true })
    .eq('id', restaurantId);

  if (error) return { error: "Error finalizando configuración" };
  return { success: true };
}
