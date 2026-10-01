const fs = require('fs');
const file = 'apps/web/src/app/api/siat/invoices/route.ts';
let content = fs.readFileSync(file, 'utf8');

const oldFetch = `const { data, error } = await supabaseAdmin
            .from('invoices')
            .select('*, orders(id, table_number, total, customer_name, customer_nit)')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(100);`;
            
const newFetch = `let query = supabaseAdmin
            .from('invoices')
            .select('*, orders(id, table_number, total, customer_name, customer_nit)')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(100);
            
        const branchId = searchParams.get('branchId');
        if (branchId) query = query.eq('branch_id', branchId);
        
        const { data, error } = await query;`;
        
content = content.replace(oldFetch, newFetch);
fs.writeFileSync(file, content);
