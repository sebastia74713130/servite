const fs = require('fs');
const file = 'apps/web/src/components/SiatSettingsForm.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/className=\{\`w-full border border-\[#E5E7EB\] \$\{isMainBranch === false \? 'bg-gray-100 cursor-not-allowed' : ''\}/g, "className={`w-full border border-[#E5E7EB] ${isMainBranch === false ? 'bg-gray-100 cursor-not-allowed' : ''}`");

fs.writeFileSync(file, content);
