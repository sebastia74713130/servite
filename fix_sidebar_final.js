const fs = require('fs');
let content = fs.readFileSync('apps/web/src/components/Sidebar.tsx', 'utf8');

content = content.replace(
  /\{ name: "Reservas", href: "\/reservations", icon: CalendarClock, minPlan: 'PRO' \},/,
  `{ name: "Reservas", href: "/reservations", icon: CalendarClock },`
);

content = content.replace(
  /if \(link\.minPlan === 'PRO' && currentPlan === 'BASIC'\) return false;\n\s*if \(link\.minPlan === 'FULL' && \(currentPlan === 'BASIC' || currentPlan === 'PRO'\)\) return false;/,
  ``
);

fs.writeFileSync('apps/web/src/components/Sidebar.tsx', content);
