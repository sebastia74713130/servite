const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');

content = content.replace(
  /<\/form>\n\s*<div className="mt-6 space-y-3">/,
  `</form>\n        )}\n        <div className="mt-6 space-y-3">`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', content);
