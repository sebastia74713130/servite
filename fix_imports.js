const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');

// Undo the bad sed
content = content.replace(/import \{ AlertCircle,/g, "import {");

// Now properly add it to the lucide-react import block
content = content.replace(
  /Settings,\n\s*Image as ImageIcon\n\} from 'lucide-react';/,
  `Settings,\n  Image as ImageIcon,\n  AlertCircle\n} from 'lucide-react';`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', content);
