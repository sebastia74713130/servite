const fs = require('fs');
const file = 'apps/web/src/hooks/useDashboardStats.ts';
let content = fs.readFileSync(file, 'utf8');

// Change function signature
content = content.replace(
  "export function useDashboardStats(restaurantId: string | undefined)",
  "export function useDashboardStats(restaurantId: string | undefined, branchId?: string)"
);

// Add branch filter to query
content = content.replace(
  /const \{ data: orders \} = await supabase\n\s*\.from\("orders"\)\n\s*\.select\("status, total, created_at, is_paid, table_id, customer_session_id"\)\n\s*\.eq\("restaurant_id", restaurantId\)\n\s*\.gte\("created_at", today\.toISOString\(\)\);/,
  `let query = supabase
        .from("orders")
        .select("status, total, created_at, is_paid, table_id, customer_session_id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString());
      if (branchId) query = query.eq("branch_id", branchId);
      const { data: orders } = await query;`
);

// Add branchId to dependency array
content = content.replace(
  "}, [restaurantId]);",
  "}, [restaurantId, branchId]);"
);

fs.writeFileSync(file, content);
