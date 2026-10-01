const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/finances/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The call is `fetch('/api/siat/sincronizar', { method: 'POST', body: JSON.stringify({ restaurantId: restaurant.id }) })`
content = content.replace(
  "fetch('/api/siat/sincronizar', { method: 'POST', body: JSON.stringify({ restaurantId: restaurant.id }) })",
  "fetch('/api/siat/sincronizar', { method: 'POST', body: JSON.stringify({ restaurantId: restaurant.id, branchId: branch?.id }) })"
);

fs.writeFileSync(file, content);
