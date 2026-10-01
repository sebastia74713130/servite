const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/invoices/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("const { restaurant, loading: sessionLoading } = useRestaurantSession();", "const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();");
content = content.replace("restaurant?.id", "restaurant?.id, branch?.id");
content = content.replace("/api/siat/invoices?restaurantId=${restaurant?.id}", "/api/siat/invoices?restaurantId=${restaurant?.id}&branchId=${branch?.id || ''}");

fs.writeFileSync(file, content);
