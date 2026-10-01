const fs = require('fs');
const file = 'apps/web/src/app/r/[restaurantSlug]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBranches = `const { data: branch } = await supabaseAdmin
    .from('branches')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .limit(1)
    .single();`;

const newBranches = `const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, name')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true);`;

content = content.replace(oldBranches, newBranches);

const oldFlow = `<ReservationFlow restaurant={restaurant} branchId={branch?.id} />`;
const newFlow = `<ReservationFlow restaurant={restaurant} branches={branches || []} />`;

content = content.replace(oldFlow, newFlow);

fs.writeFileSync(file, content);
