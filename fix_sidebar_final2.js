const fs = require('fs');
let content = fs.readFileSync('apps/web/src/components/Sidebar.tsx', 'utf8');

content = content.replace(
  /if \(link\.minPlan === 'PRO' && currentPlan === 'BASIC'\) return false;/g,
  ""
);
content = content.replace(
  /if \(link\.minPlan === 'FULL' && \(currentPlan === 'BASIC' \|\| currentPlan === 'PRO'\)\) return false;/g,
  ""
);

fs.writeFileSync('apps/web/src/components/Sidebar.tsx', content);
