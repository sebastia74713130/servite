const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/menu/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter } from 'next/navigation';\nimport { copyMenuFromMainBranch } from '@/app/actions';");

fs.writeFileSync(file, content);
