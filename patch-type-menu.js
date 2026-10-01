const fs = require('fs');
const file = 'apps/web/src/app/m/[restaurantSlug]/[tableCode]/PublicMenuClient.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("const schedule = restaurant.operating_hours[currentDay];", "const schedule = restaurant.operating_hours[currentDay as keyof typeof restaurant.operating_hours];");

fs.writeFileSync(file, content);
