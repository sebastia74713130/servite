const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/inventory/InventoryItemModal.tsx', 'utf8');

content = content.replace(
  /const \[minStock, setMinStock\] = useState\(parseFloat\(item\?\.min_stock\?\.toString\(\) \|\| '0'\)\);/,
  "const [minStock, setMinStock] = useState<string | number>(item?.min_stock ?? '');"
);

content = content.replace(
  /min_stock: minStock,/,
  "min_stock: parseFloat(minStock.toString()) || 0,"
);

content = content.replace(
  /onChange=\{e => setMinStock\(parseFloat\(e\.target\.value\) \|\| 0\)\}/,
  "onChange={e => setMinStock(e.target.value)}"
);

fs.writeFileSync('apps/web/src/app/(dashboard)/inventory/InventoryItemModal.tsx', content);
