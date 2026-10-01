const fs = require('fs');

// 1. Update API route to expect branchId
let emitirFile = 'apps/web/src/app/api/siat/emitir/route.ts';
let emitirContent = fs.readFileSync(emitirFile, 'utf8');

emitirContent = emitirContent.replace("const { restaurantId, orderId, facturaParams } = body;", "const { restaurantId, orderId, branchId, facturaParams } = body;");
emitirContent = emitirContent.replace(".eq('id', orderData.branch_id)", ".eq('id', branchId)");

fs.writeFileSync(emitirFile, emitirContent);

// 2. Update accounts/page.tsx
let accountsFile = 'apps/web/src/app/(dashboard)/accounts/page.tsx';
let accountsContent = fs.readFileSync(accountsFile, 'utf8');

accountsContent = accountsContent.replace(
  "JSON.stringify({\n            restaurantId: restaurant.id,\n            orderId: currentOrder.id,\n            facturaParams",
  "JSON.stringify({\n            restaurantId: restaurant.id,\n            branchId: branch?.id,\n            orderId: currentOrder.id,\n            facturaParams"
);
fs.writeFileSync(accountsFile, accountsContent);

// 3. Update PublicMenuClient.tsx
let publicMenuFile = 'apps/web/src/app/m/[restaurantSlug]/[tableCode]/PublicMenuClient.tsx';
let publicMenuContent = fs.readFileSync(publicMenuFile, 'utf8');

publicMenuContent = publicMenuContent.replace(
  "JSON.stringify({\n            restaurantId: restaurant.id,\n            orderId: order.id,\n            facturaParams",
  "JSON.stringify({\n            restaurantId: restaurant.id,\n            branchId: restaurantTable.branch_id,\n            orderId: order.id,\n            facturaParams"
);
fs.writeFileSync(publicMenuFile, publicMenuContent);

