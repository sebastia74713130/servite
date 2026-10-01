const fs = require('fs');
const file = 'apps/web/src/app/actions.ts';
let content = fs.readFileSync(file, 'utf8');

const oldReturn = `return { restaurant, branch, role: userRole, billingCycle: billing_cycle };`;

const newReturn = `
  let isMainBranch = true;
  if (branch) {
    const { data: firstBranch } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    if (firstBranch && firstBranch.id !== branch.id) {
      isMainBranch = false;
    }
  }

  return { restaurant, branch, role: userRole, billingCycle: billing_cycle, isMainBranch };`;

content = content.replace(oldReturn, newReturn);
fs.writeFileSync(file, content);
