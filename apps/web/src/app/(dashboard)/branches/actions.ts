"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function createBranch(restaurantId: string, name: string, address: string) {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .insert({
      restaurant_id: restaurantId,
      name,
      address,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }
  return { success: true, branch: data };
}

export async function createBranchUser(
  restaurantId: string,
  branchId: string,
  username: string,
  name: string,
  role: string,
  password: string
) {
  // Check if username is taken in DB
  const { data: existing } = await supabaseAdmin
    .from('restaurant_users')
    .select('id')
    .eq('username', username)
    .single();

  if (existing) {
    return { error: "El usuario ya está en uso." };
  }

  const dummyEmail = `${username}@users.servido.app`;

  // Create Auth User
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: dummyEmail,
    password: password,
    email_confirm: true,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Error desconocido al crear el usuario en Auth." };
  }

  // Create Profile in restaurant_users
  const { error: profileError } = await supabaseAdmin
    .from('restaurant_users')
    .insert({
      restaurant_id: restaurantId,
      user_id: authData.user.id,
      role: role,
      branch_id: branchId || null,
      username: username,
      name: name
    });

  if (profileError) {
    // Rollback auth user
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  return { success: true };
}

export async function deleteBranchUser(userId: string) {
  // First, find the auth_user_id
  const { data: profile } = await supabaseAdmin
    .from('restaurant_users')
    .select('user_id')
    .eq('id', userId)
    .single();

  if (!profile) return { error: "Usuario no encontrado" };

  const { error } = await supabaseAdmin.auth.admin.deleteUser(profile.user_id);
  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

