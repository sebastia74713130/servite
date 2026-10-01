const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', 'utf8');

// 1. Add Lock to imports
content = content.replace(
  /Sparkles\n\} from 'lucide-react';/,
  `Sparkles,\n  Lock\n} from 'lucide-react';`
);

// 2. Add lock icon to tab
content = content.replace(
  /Receta \{\(\!product\) && '\(Guarda para añadir\)'\}/,
  `Receta {(!product) ? '(Guarda para añadir)' : ''}
            {(restaurant?.subscription_plan || '').toUpperCase() === 'BASIC' && product && <Lock size={12} className="inline-block ml-1 opacity-70" />}`
);

// 3. Add Premium empty state in activeTab === 'recipe'
const premiumState = `
          <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-b-2xl items-center justify-center p-8 text-center min-h-[300px]">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-[#E76F51]" />
            </div>
            <h2 className="text-xl font-bold text-[#1F2933] mb-2">Módulo Premium</h2>
            <p className="text-gray-500 mb-6 max-w-sm">
              La gestión de recetas, vinculación con el inventario y cálculo de Food Cost está disponible a partir del plan Pro.
            </p>
            <a href="mailto:ventas@servido.com" className="bg-[#1F2933] hover:bg-[#111827] text-white px-6 py-2.5 rounded-xl font-bold transition-colors">
              Mejorar a Pro
            </a>
          </div>
`;

content = content.replace(
  /\) : activeTab === 'recipe' && product \? \(\n\s*<div className="flex-1 overflow-hidden flex flex-col bg-gray-50 rounded-b-2xl">\n\s*<ProductRecipeTab product=\{product\} restaurantId=\{restaurantId\} \/>\n\s*<\/div>/,
  `) : activeTab === 'recipe' && product ? (
          (restaurant?.subscription_plan || '').toUpperCase() === 'BASIC' ? (
${premiumState}
          ) : (
          <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 rounded-b-2xl">
            <ProductRecipeTab product={product} restaurantId={restaurantId} />
          </div>
          )`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/menu/page.tsx', content);
