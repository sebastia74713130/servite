const fs = require('fs');
const files = [
    'apps/web/src/app/api/siat/cufd/route.ts',
    'apps/web/src/app/api/siat/cuis/route.ts',
    'apps/web/src/app/api/siat/sincronizar/route.ts'
];

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    const importBranch = `import { resolveBranchId } from "@/lib/siat/branchHelper";\n`;
    if (!code.includes('resolveBranchId')) {
        code = code.replace('import { siatConfig }', importBranch + 'import { siatConfig }');
    }
    code = code.replace('const branchId = body.branchId || restaurantId;', 'const branchId = await resolveBranchId(restaurantId, body.branchId);');
    fs.writeFileSync(file, code);
}
