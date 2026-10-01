const fs = require('fs');

let settings = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');

settings = settings.replace(
  "import {",
  "import { AlertCircle,"
);

settings = settings.replace(
  /const limit = currentPlan === 'BASIC' \? 1 : currentPlan === 'PRO' \? 2 : 5;/,
  "const limit = ((currentPlan || '').toUpperCase() === 'BASIC' || (currentPlan || '').toUpperCase() === 'PRO') ? 1 : 5;"
);

settings = settings.replace(
  /<form onSubmit=\{handleAddStation\} className="flex gap-4">/,
  `{stations.length >= (((restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'BASIC' || (restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'PRO') ? 1 : 5) ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-orange-800 text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            Tu plan actual permite un máximo de {(((restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'BASIC' || (restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'PRO') ? 1 : 5)} pantalla(s) de cocina. Para crear más, <a href="mailto:ventas@servido.com" className="font-bold underline ml-1">contacta a ventas</a>.
          </div>
        ) : (
          <form onSubmit={handleAddStation} className="flex gap-4">`
);

settings = settings.replace(
  /<\/form>\n\s*<div className="grid grid-cols-1/,
  `</form>\n        )}\n        <div className="grid grid-cols-1`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', settings);
