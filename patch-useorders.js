const fs = require('fs');
const file = 'apps/web/src/hooks/useOrders.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "export function useOrders(restaurantId: string | undefined, options: { onlyUnpaid?: boolean } = { onlyUnpaid: false }) {",
  "export function useOrders(restaurantId: string | undefined, branchId?: string, options: { onlyUnpaid?: boolean } = { onlyUnpaid: false }) {"
);

content = content.replace(
  ".order(\"created_at\", { ascending: false });",
  ".order(\"created_at\", { ascending: false });\n    if (branchId) query = query.eq(\"branch_id\", branchId);"
);

// We should also update the subscription filter. But currently the filter string doesn't support multiple eq with AND easily in the string syntax. Actually it does: `restaurant_id=eq.${restaurantId}&branch_id=eq.${branchId}`. But since it's just triggering a refetch, if it triggers too often it's fine, the select query filters it.

content = content.replace(
  "}, [restaurantId]);",
  "}, [restaurantId, branchId]);"
);

fs.writeFileSync(file, content);
