const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', 'utf8');

// 1. Pass subscriptionPlan
content = content.replace(
  /<ProductModal\n\s*product=\{editingProduct\}\n\s*categories=\{categories\}\n\s*stations=\{stations\}\n\s*restaurantId=\{restaurant\?\.id\}\n\s*branchId=\{branch\?\.id\}/,
  `<ProductModal
          product={editingProduct}
          categories={categories}
          stations={stations}
          restaurantId={restaurant?.id}
          branchId={branch?.id}
          subscriptionPlan={restaurant?.subscription_plan}`
);

// 2. Accept subscriptionPlan in signature
content = content.replace(
  /function ProductModal\(\{\n\s*product,\n\s*categories,\n\s*stations,\n\s*restaurantId,\n\s*branchId,\n\s*onClose,\n\s*onSaved,\n\}\: \{/,
  `function ProductModal({
  product,
  categories,
  stations,
  restaurantId,
  branchId,
  subscriptionPlan,
  onClose,
  onSaved,
}: {`
);

// 3. Add to type definition
content = content.replace(
  /categories: Category\[\];\n\s*stations: any\[\];\n\s*restaurantId: string;\n\s*branchId: string;\n\s*onClose: \(\) => void;\n\s*onSaved: \(\) => void;\n\}\) \{/,
  `categories: Category[];
  stations: any[];
  restaurantId: string;
  branchId: string;
  subscriptionPlan?: string;
  onClose: () => void;
  onSaved: () => void;
}) {`
);

// 4. Update the logic inside ProductModal to use subscriptionPlan
content = content.replace(
  /\(restaurant\?\.subscription_plan \|\| ''\)\.toUpperCase\(\) === 'BASIC'/g,
  `(subscriptionPlan || '').toUpperCase() === 'BASIC'`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', content);
