const fs = require('fs');
const file = 'apps/web/src/app/api/siat/anular/route.ts';
let code = fs.readFileSync(file, 'utf8');

const importBranch = `import { resolveBranchId } from "@/lib/siat/branchHelper";\n`;
if (!code.includes('resolveBranchId')) {
  code = code.replace('import { siatConfig }', importBranch + 'import { siatConfig }');
}

const findInvoice = `
        const { data: invoice } = await supabaseAdmin.from('invoices').select('branch_id').eq('cuf', cuf).single();
        const branchId = await resolveBranchId(restaurantId, invoice?.branch_id);
`;
code = code.replace('const { data: siatSettings } = await supabaseAdmin', findInvoice + '\n        const { data: siatSettings } = await supabaseAdmin');

const applyBranch = `
        let cuis = siatSettings.siat_cuis;
        let cufd = siatSettings.siat_cufd;
        let sucursal = siatSettings.siat_codigo_sucursal ? String(siatSettings.siat_codigo_sucursal) : "0";
        let puntoVenta = siatSettings.siat_codigo_punto_venta ? String(siatSettings.siat_codigo_punto_venta) : "0";

        if (branchId) {
            const { data: branchData } = await supabaseAdmin.from('branches').select('*').eq('id', branchId).single();
            if (branchData) {
                cuis = branchData.siat_cuis || cuis;
                cufd = branchData.siat_cufd || cufd;
                sucursal = branchData.siat_codigo_sucursal !== null ? String(branchData.siat_codigo_sucursal) : sucursal;
                puntoVenta = branchData.siat_codigo_punto_venta !== null ? String(branchData.siat_codigo_punto_venta) : puntoVenta;
            }
        }
`;

code = code.replace(/const pv = parseInt\(siatSettings.siat_codigo_punto_venta\) \|\| 0;/, applyBranch + '\n        const pv = parseInt(puntoVenta) || 0;');
code = code.replace(/cufd: siatSettings.siat_cufd,/, 'cufd: cufd,');
code = code.replace(/cuis: siatSettings.siat_cuis,/, 'cuis: cuis,');
code = code.replace(/codigoSucursal: parseInt\(siatSettings.siat_codigo_sucursal\) \|\| 0,/, 'codigoSucursal: parseInt(sucursal) || 0,');

fs.writeFileSync(file, code);
