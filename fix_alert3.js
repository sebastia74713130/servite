const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');

content = content.replace(
  /Image as ImageIcon\n\} from 'lucide-react';/,
  `Image as ImageIcon,\n  AlertCircle\n} from 'lucide-react';`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', content);
