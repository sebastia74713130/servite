const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The string was `<InventoryItemModal branchId={branch?.id}\n          item={selectedItem}\n          restaurantId={restaurant.id}\n          branchId={branch.id}` probably?
// Let's just remove `branchId={branch?.id}` since the original already had `branchId={branch.id}`.

content = content.replace("branchId={branch?.id}", "");

fs.writeFileSync(file, content);
