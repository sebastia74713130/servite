const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "<SiatSettingsForm restaurantId={restaurant.id} isMainBranch={isMainBranch} />",
  "<SiatSettingsForm restaurantId={restaurant.id} branchId={branch?.id} isMainBranch={isMainBranch} />"
);

fs.writeFileSync(file, content);
