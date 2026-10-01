const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', 'utf8');

content = content.replace(
  /restaurantId: string;\n\s*branchId: string;\n\s*onClose: \(\) => void;\n\s*onSaved: \(\) => void;\n\}\) \{/,
  `restaurantId: string;
  branchId: string;
  subscriptionPlan?: string;
  onClose: () => void;
  onSaved: () => void;
}) {`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', content);
