const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/PurchasesView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add branchId parameter to fetchMovements
content = content.replace(
  /const fetchMovements = async \(\) => \{\n\s*const \{ data \} = await supabase\n\s*\.from\('inventory_movements'\)\n\s*\.select\('\*, inventory_items\(name, unit\)'\)\n\s*\.eq\('restaurant_id', restaurantId\)\n\s*\.eq\('movement_type', 'purchase'\)/,
  `const fetchMovements = async () => {
    let query = supabase
      .from('inventory_movements')
      .select('*, inventory_items(name, unit)')
      .eq('restaurant_id', restaurantId)
      .eq('movement_type', 'purchase');
    if (branchId) query = query.eq('branch_id', branchId);
    
    const { data } = await query`
);

// 2. Add branch_id to inventory_movements insert
content = content.replace(
  /await supabase\.from\('inventory_movements'\)\.insert\(\{\n\s*restaurant_id: restaurantId,\n\s*inventory_item_id: selectedItemId,/,
  `await supabase.from('inventory_movements').insert({
        restaurant_id: restaurantId,
        branch_id: branchId,
        inventory_item_id: selectedItemId,`
);

fs.writeFileSync(file, content);
