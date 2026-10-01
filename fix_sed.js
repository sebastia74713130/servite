const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/inventory/page.tsx', 'utf8');
content = content.replace(/restaurant\?\.\[?\(?subscription_plan \|\| ''\)\?\.?toUpperCase\(\) === 'BASIC'/g, "(restaurant?.subscription_plan || '').toUpperCase() === 'BASIC'");
content = content.replace("restaurant?.(subscription_plan || '').toUpperCase() === 'BASIC'", "(restaurant?.subscription_plan || '').toUpperCase() === 'BASIC'");
fs.writeFileSync('apps/web/src/app/(dashboard)/inventory/page.tsx', content);

let modal = fs.readFileSync('apps/web/src/app/(dashboard)/inventory/InventoryItemModal.tsx', 'utf8');
modal = modal.replace("restaurant?.(subscriptionPlan || '').toUpperCase() === 'PRO'", "(restaurant?.subscription_plan || '').toUpperCase() === 'PRO'");
modal = modal.replace("subscriptionPlan?.(subscriptionPlan || '').toUpperCase() === 'PRO'", "(subscriptionPlan || '').toUpperCase() === 'PRO'");
fs.writeFileSync('apps/web/src/app/(dashboard)/inventory/InventoryItemModal.tsx', modal);
