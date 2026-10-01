const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/InventoryItemModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add Lock import if not present
if (!content.includes('Lock')) {
  content = content.replace("AlertCircle, Check", "AlertCircle, Check, Lock");
}

// Add subscriptionPlan to Props
content = content.replace(
  /branchId: string;\n\s*onClose: \(\) => void;/,
  `branchId: string;
  subscriptionPlan?: string;
  onClose: () => void;`
);

// Destructure subscriptionPlan
content = content.replace(
  /export function InventoryItemModal\(\{ item, restaurantId, branchId, onClose, onSaved \}: Props\) \{/,
  `export function InventoryItemModal({ item, restaurantId, branchId, subscriptionPlan, onClose, onSaved }: Props) {`
);

// We need to manage minStock as state instead of constant so it can be edited!
content = content.replace(
  /const minStock = parseFloat\(item\?\.min_stock\?\.toString\(\) \|\| '0'\);/,
  `const [minStock, setMinStock] = useState(parseFloat(item?.min_stock?.toString() || '0'));`
);

// Add the min_stock input
const newUnitDiv = `
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Unidad de Medida</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] transition-colors bg-white"
                >
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="g">Gramos (g)</option>
                  <option value="L">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="unidades">Unidades</option>
                  <option value="paquetes">Paquetes</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center justify-between">
                  Stock Mínimo (Alerta)
                  {subscriptionPlan === 'Basic' && <Lock size={14} className="text-gray-400" />}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minStock}
                  onChange={e => setMinStock(parseFloat(e.target.value) || 0)}
                  disabled={subscriptionPlan === 'Basic'}
                  className={\`w-full border rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 transition-colors \${
                    subscriptionPlan === 'Basic' 
                      ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'border-[#E5E7EB] focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] bg-white'
                  }\`}
                />
                {subscriptionPlan === 'Basic' && (
                  <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1 font-medium">
                    <Lock size={12} /> Disponible en plan Pro
                  </p>
                )}
              </div>
            </div>
`;

content = content.replace(
  /<div className="grid grid-cols-1 gap-4">[\s\S]*?<\/select>\n\s*<\/div>\n\s*<\/div>/,
  newUnitDiv
);

fs.writeFileSync(file, content);
