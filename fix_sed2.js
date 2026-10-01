const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/inventory/page.tsx', 'utf8');
content = content.replace(/restaurant\?\.\(subscription_plan \|\| ''\)\.toUpperCase\(\) === 'PRO'/g, "(restaurant?.subscription_plan || '').toUpperCase() === 'PRO'");
fs.writeFileSync('apps/web/src/app/(dashboard)/inventory/page.tsx', content);
