const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', 'utf8');

content = content.replace(
  /Pencil,\n\} from 'lucide-react';/,
  `Pencil,\n  Lock\n} from 'lucide-react';`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', content);
