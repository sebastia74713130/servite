const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Change existing locks from 'Basic' to 'Pro'
content = content.replace(/subscription_plan === 'Basic'/g, "subscription_plan === 'Pro'");

// 2. Add full page lock for 'Basic'
const fullPageLock = `
  if (restaurant?.subscription_plan === 'Basic') {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-[#E76F51]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1F2933] mb-3">Módulo Premium</h2>
          <p className="text-gray-500 mb-8 text-lg">
            El control de inventario completo, seguimiento de ingresos, alertas de stock y mermas está disponible a partir del plan Pro.
          </p>
          <a href="mailto:ventas@servido.com" className="bg-[#1F2933] hover:bg-[#111827] text-white px-8 py-3 rounded-xl font-bold transition-colors inline-block">
            Mejorar a Pro
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col">
`;

content = content.replace(
  /  return \(\n\s*<div className="p-8 h-full flex flex-col">/m,
  fullPageLock
);

fs.writeFileSync(file, content);
