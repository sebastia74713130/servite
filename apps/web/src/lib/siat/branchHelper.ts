import { supabaseAdmin } from "@/lib/supabase-admin";

export async function resolveBranchId(restaurantId: string, providedBranchId?: string | null) {
  if (providedBranchId) {
    // If it happens to be the restaurantId (due to old fallback logic), we still need to resolve to main branch
    // Because branch IDs are UUIDs, we can check if it matches a branch. 
    // Actually, we can just return it, and if it fails, fallback to main branch? 
    // It's safer to just return providedBranchId unless it equals restaurantId.
    if (providedBranchId !== restaurantId) {
        return providedBranchId;
    }
  }

  // Fallback to main branch
  const { data: firstBranch } = await supabaseAdmin
    .from('branches')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return firstBranch?.id || null;
}
