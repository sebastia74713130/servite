const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("const schedule = operatingHours[day];", "const schedule = operatingHours[day as keyof typeof operatingHours];");
content = content.replace("daysEs[day]", "daysEs[day as keyof typeof daysEs]");

fs.writeFileSync(file, content);
