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

export async function getDashboardStats(restaurantId: string, branchId?: string) {
  let query = supabaseAdmin
    .from('orders')
    .select('id, total, created_at, is_paid')
    .eq('restaurant_id', restaurantId)
    .eq('is_paid', true);
  
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: orders, error: ordersError } = await query;
  if (ordersError) throw new Error(ordersError.message);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let totalGanancia = 0;
  let monthlyGanancia = 0;
  let prevMonthlyGanancia = 0;

  const monthlyData = [
    { name: 'Ene', value: 0 },
    { name: 'Feb', value: 0 },
    { name: 'Mar', value: 0 },
    { name: 'Abr', value: 0 },
    { name: 'May', value: 0 },
    { name: 'Jun', value: 0 },
    { name: 'Jul', value: 0 },
    { name: 'Ago', value: 0 },
    { name: 'Sep', value: 0 },
    { name: 'Oct', value: 0 },
    { name: 'Nov', value: 0 },
    { name: 'Dic', value: 0 },
  ];

  const weeklyData = [
    { name: 'Lun', value: 0 },
    { name: 'Mar', value: 0 },
    { name: 'Mié', value: 0 },
    { name: 'Jue', value: 0 },
    { name: 'Vie', value: 0 },
    { name: 'Sáb', value: 0 },
    { name: 'Dom', value: 0 },
  ];

  const currentDayOfWeek = now.getDay() || 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDayOfWeek + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  for (const order of (orders || [])) {
    const date = new Date(order.created_at);
    const orderTotal = order.total || 0;
    
    totalGanancia += orderTotal;

    if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
      monthlyGanancia += orderTotal;
    }
    if (date.getFullYear() === prevMonthYear && date.getMonth() === prevMonth) {
      prevMonthlyGanancia += orderTotal;
    }

    if (date.getFullYear() === currentYear) {
      monthlyData[date.getMonth()].value += orderTotal;
    }

    if (date >= startOfWeek) {
      let dayIndex = date.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6;
      weeklyData[dayIndex].value += orderTotal;
    }
  }

  // Top Products via inner join
  let itemsQuery = supabaseAdmin
    .from('order_items')
    .select('quantity, product_name, orders!inner(is_paid, restaurant_id, branch_id)')
    .eq('orders.is_paid', true)
    .eq('orders.restaurant_id', restaurantId);

  if (branchId) {
    itemsQuery = itemsQuery.eq('orders.branch_id', branchId);
  }

  const { data: items, error: itemsError } = await itemsQuery;
  let topProducts: {name: string, value: number, max: number}[] = [];

  if (!itemsError && items) {
    const productCounts: Record<string, number> = {};
    for (const item of items) {
      if (item.product_name) {
        productCounts[item.product_name] = (productCounts[item.product_name] || 0) + (item.quantity || 1);
      }
    }

    const sortedProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const maxVal = sortedProducts.length > 0 ? sortedProducts[0][1] : 100;
    
    topProducts = sortedProducts.map(([name, value]) => ({
      name,
      value,
      max: maxVal
    }));
  }

  return {
    totalGanancia,
    monthlyGanancia,
    prevMonthlyGanancia,
    monthlyData,
    weeklyData,
    topProducts
  };
}
