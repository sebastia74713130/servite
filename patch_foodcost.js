const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/FoodCostView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \{ data: recipes \} = await supabase\n\s*\.from\('product_recipes'\)\n\s*\.select\('\*, inventory_items\(cost_per_unit\)'\);/,
  `const { data: recipes } = await supabase
          .from('product_recipes')
          .select('*, inventory_items!inner(cost_per_unit, branch_id)')
          .eq('inventory_items.branch_id', branchId);`
);

content = content.replace(
  "}, [restaurantId]);",
  "}, [restaurantId, branchId]);"
);

fs.writeFileSync(file, content);
