const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the form that adds a new station
content = content.replace(
  /<form onSubmit=\{handleAddStation\} className="flex gap-4">/,
  `{stations.length >= ((restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'BASIC' || (restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'PRO' ? 1 : 5) ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-orange-800 text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            Tu plan actual permite un máximo de {((restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'BASIC' || (restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'PRO' ? 1 : 5)} pantalla(s) de cocina. Para crear más, <a href="mailto:ventas@servido.com" className="font-bold underline ml-1">contacta a ventas</a>.
          </div>
        ) : (
          <form onSubmit={handleAddStation} className="flex gap-4">`
);

content = content.replace(
  /<\/form>\n\s*<div className="grid grid-cols-1/,
  `</form>\n        )}\n        <div className="grid grid-cols-1`
);

fs.writeFileSync(file, content);
