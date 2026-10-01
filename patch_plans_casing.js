const fs = require('fs');
function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/subscription_plan === 'Basic'/g, "(subscription_plan || '').toUpperCase() === 'BASIC'");
  content = content.replace(/subscriptionPlan === 'Basic'/g, "(subscriptionPlan || '').toUpperCase() === 'BASIC'");
  content = content.replace(/subscription_plan === 'Pro'/g, "(subscription_plan || '').toUpperCase() === 'PRO'");
  content = content.replace(/subscriptionPlan === 'Pro'/g, "(subscriptionPlan || '').toUpperCase() === 'PRO'");
  // Also fix the full page lock logic
  content = content.replace(/restaurant\?\.subscription_plan === 'Basic'/g, "(restaurant?.subscription_plan || '').toUpperCase() === 'BASIC'");
  content = content.replace(/restaurant\?\.subscription_plan === 'Pro'/g, "(restaurant?.subscription_plan || '').toUpperCase() === 'PRO'");
  fs.writeFileSync(file, content);
}

replaceInFile('apps/web/src/app/(dashboard)/inventory/page.tsx');
replaceInFile('apps/web/src/app/(dashboard)/inventory/InventoryItemModal.tsx');

// Now update settings/page.tsx limit
let settings = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');
// Limit: Basic = 1, Pro = 1, Enterprise = 5 or unlimited
settings = settings.replace(
  /const limit = currentPlan === 'BASIC' \? 1 : currentPlan === 'PRO' \? 2 : 5;/,
  "const limit = (currentPlan === 'BASIC' || currentPlan === 'PRO') ? 1 : 5;"
);
fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', settings);
