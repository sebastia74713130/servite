const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/finances/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `setActiveRegister(result.data);\n      setShowOpenModal(false);\n      setOpeningBalance('');`;
const replacementStr = `setActiveRegister(result.data);\n      setShowOpenModal(false);\n      setOpeningBalance('');\n\n      // Auto-generate CUFD in background\n      fetch('/api/siat/cufd', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ restaurantId: restaurant.id })\n      }).then(res => res.json()).then(data => {\n        if (data.success) {\n           console.log('CUFD generado automáticamente:', data.cufd);\n        } else {\n           console.warn('Advertencia SIAT (CUFD):', data.error || data.message);\n        }\n      }).catch(err => console.error('Error generando CUFD:', err));\n\n      // Auto-sync catalogs in background\n      fetch('/api/siat/sincronizar', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ restaurantId: restaurant.id })\n      }).catch(err => console.error('Error sincronizando catálogos:', err));`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content);
  console.log("Patched finances successfully.");
} else {
  console.log("Target string not found in finances.");
}
