const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/ReconciliationView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update Props
content = content.replace(
  "export function ReconciliationView({ restaurantId, onSaved }: { restaurantId: string; onSaved?: () => void; }) {",
  "export function ReconciliationView({ restaurantId, branchId, onSaved }: { restaurantId: string; branchId: string; onSaved?: () => void; }) {"
);

// 2. Update query
content = content.replace(
  /supabase\.from\('inventory_items'\)\n\s*\.select\('\*'\)\n\s*\.eq\('restaurant_id', restaurantId\)\n\s*\.eq\('is_active', true\)/,
  `supabase.from('inventory_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('branch_id', branchId)
      .eq('is_active', true)`
);

// 3. Update useEffect dependencies
content = content.replace(
  "}, [restaurantId]);",
  "}, [restaurantId, branchId]);"
);

// 4. Update insert
content = content.replace(
  /await supabase\.from\('inventory_movements'\)\.insert\(\{\n\s*restaurant_id: restaurantId,\n\s*inventory_item_id: item\.id,/,
  `await supabase.from('inventory_movements').insert({
        restaurant_id: restaurantId,
        branch_id: branchId,
        inventory_item_id: item.id,`
);

fs.writeFileSync(file, content);
