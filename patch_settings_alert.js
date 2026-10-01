const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');

// 1. Remove the native alert and replace with a toast/inline or just remove it if we hide the form.
// Actually, let's just use `alert()` but I will hide the form so they don't even see it.
// Or wait, if I hide the form, I don't need the alert.
content = content.replace(
  /if \(stations\.length >= limit\) \{\n\s*alert\(\`Tu plan \$\{currentPlan\} permite un máximo de \$\{limit\} estación\(es\) de cocina\. Contacta soporte para mejorar tu plan\.\`\);\n\s*return;\n\s*\}/,
  `if (stations.length >= limit) {
      return;
    }`
);

// 2. Hide the form using the proper regex
content = content.replace(
  /<form onSubmit=\{handleAddStation\} className="flex items-end gap-4 mt-6">/,
  `{stations.length >= (((restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'BASIC' || (restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'PRO') ? 1 : 5) ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800 text-sm mt-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={18} className="text-[#E76F51]" />
              Límite de estaciones alcanzado
            </div>
            <p>
              Tu plan actual permite un máximo de {(((restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'BASIC' || (restaurant?.subscription_plan || 'BASIC').toUpperCase() === 'PRO') ? 1 : 5)} pantalla(s) de cocina. Para crear más, <a href="mailto:ventas@servido.com" className="font-bold underline ml-1 text-[#E76F51]">contacta a soporte para mejorar tu plan</a>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleAddStation} className="flex items-end gap-4 mt-6">`
);

content = content.replace(
  /<\/form>\n\s*<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">/,
  `</form>\n        )}\n        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">`
);

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', content);
