"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getUserRestaurant(userId: string) {
  if (!userId) return null;
  
  const { data: restUsers } = await supabaseAdmin
    .from('restaurant_users')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (!restUsers || restUsers.length === 0) {
    return null; // El usuario no tiene restaurante
  }
  
  const userRole = restUsers[0].role;
  const userBranchId = restUsers[0].branch_id;

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('id', restUsers[0].restaurant_id)
    .single();

  if (!restaurant) return null;

  let branchQuery = supabaseAdmin
    .from('branches')
    .select('*')
    .eq('restaurant_id', restaurant.id);
    
  if (userBranchId) {
    branchQuery = branchQuery.eq('id', userBranchId);
  }
  
  const { data: branch } = await branchQuery.limit(1).single();

  return { restaurant, branch, role: userRole };
}

export async function createExpense(data: any) {
  const { error } = await supabaseAdmin.from('expenses').insert(data);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function openCashRegister(data: any) {
  const { data: res, error } = await supabaseAdmin.from('cash_registers').insert(data).select().single();
  if (error) throw new Error(error.message);
  return { success: true, data: res };
}

export async function closeCashRegister(registerId: string, closingBalance: number) {
  const { error } = await supabaseAdmin
    .from('cash_registers')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_balance: closingBalance
    })
    .eq('id', registerId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getExpenses(registerId: string) {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('cash_register_id', registerId)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data || [];
}
