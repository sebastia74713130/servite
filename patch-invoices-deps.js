const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/invoices/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("if (restaurant?.id, branch?.id)", "if (restaurant?.id && branch?.id)");
content = content.replace("}, [restaurant?.id]);", "}, [restaurant?.id, branch?.id]);");

fs.writeFileSync(file, content);
