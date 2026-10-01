const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldFetch = `const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name');`;
        
const newFetch = `let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name');
      if (branch?.id) query = query.eq('branch_id', branch.id);
      const { data, error } = await query;`;

content = content.replace(oldFetch, newFetch);
content = content.replace("fetchItems();\n  }, [restaurant?.id]);", "fetchItems();\n  }, [restaurant?.id, branch?.id]);");

// Check if InventoryItemModal receives branch_id on insert.
// Usually insert logic is in the Modal. We must pass branch?.id to the Modal.
content = content.replace(
  "<InventoryItemModal",
  "<InventoryItemModal branchId={branch?.id}"
);

fs.writeFileSync(file, content);
