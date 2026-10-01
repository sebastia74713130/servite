const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("const { restaurant, loading: sessionLoading } = useRestaurantSession();", "const { restaurant, isMainBranch, loading: sessionLoading } = useRestaurantSession();");

content = content.replace("<SiatSettingsForm restaurantId={restaurant.id} />", "<SiatSettingsForm restaurantId={restaurant.id} isMainBranch={isMainBranch} />");

fs.writeFileSync(file, content);
