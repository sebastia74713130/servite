const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Lock to lucide-react imports
content = content.replace(
  "import { Package, Plus, AlertTriangle, ArrowRight, ShoppingCart, Printer } from 'lucide-react';",
  "import { Package, Plus, AlertTriangle, ArrowRight, ShoppingCart, Printer, Lock } from 'lucide-react';"
);

// 2. Add subscriptionPlan to modal props
content = content.replace(
  /<InventoryItemModal\n\s*item=\{selectedItem\}\n\s*restaurantId=\{restaurant\.id\}\n\s*branchId=\{branch\?\.id as string\}\n\s*onClose=\{\(\) => setIsModalOpen\(false\)\}\n\s*onSaved=\{handleModalSaved\}\n\s*\/>/m,
  `<InventoryItemModal
          item={selectedItem}
          restaurantId={restaurant.id}
          branchId={branch?.id as string}
          subscriptionPlan={restaurant?.subscription_plan}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleModalSaved}
        />`
);
// Make sure one-liner also gets replaced if it was reformatted:
content = content.replace(
  /<InventoryItemModal item=\{selectedItem\} restaurantId=\{restaurant\.id\} branchId=\{branch\?\.id as string\} onClose=\{\(\) => setIsModalOpen\(false\)\} onSaved=\{handleModalSaved\} \/>/m,
  `<InventoryItemModal item={selectedItem} restaurantId={restaurant.id} branchId={branch?.id as string} subscriptionPlan={restaurant?.subscription_plan} onClose={() => setIsModalOpen(false)} onSaved={handleModalSaved} />`
);

// 3. Add Lock icons to tabs
content = content.replace(
  /Lista de Compras\n\s*\{lowStockItems\.length > 0 && \(/m,
  `Lista de Compras
          {restaurant?.subscription_plan === 'Basic' && <Lock size={14} className="ml-1 opacity-70" />}
          {lowStockItems.length > 0 && (`
);

content = content.replace(
  /Food Cost & Stats\n\s*<\/button>/m,
  `Food Cost & Stats
          {restaurant?.subscription_plan === 'Basic' && <Lock size={14} className="ml-1 opacity-70" />}
        </button>`
);

// 4. Wrap the active tab content in a Premium check if restricted
const premiumState = `
      {(activeTab === 'shopping_list' || activeTab === 'food_cost') && restaurant?.subscription_plan === 'Basic' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <Lock size={32} className="text-[#E76F51]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1F2933] mb-3">Función Premium</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
            {activeTab === 'shopping_list' ? 'La Lista de Compras automática' : 'El análisis de Food Cost y Rentabilidad'} está disponible exclusivamente en nuestros planes Pro y Enterprise.
          </p>
          <a href="mailto:ventas@servido.com" className="bg-[#1F2933] hover:bg-[#111827] text-white px-8 py-3 rounded-xl font-bold transition-colors">
            Mejorar mi plan
          </a>
        </div>
      ) : (
        <>
`;

content = content.replace(
  /\{activeTab === 'shopping_list' && \(/,
  premiumState + "\n      {activeTab === 'shopping_list' && ("
);

// We need to close the fragment at the end of the return statement.
// We will look for `      )}` which ends the Food Cost tab, and append `</>}` to it. Wait, it's safer to just inject it properly.
fs.writeFileSync(file, content);
