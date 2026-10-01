const fs = require('fs');
const file = 'apps/web/src/app/actions.ts';
let content = fs.readFileSync(file, 'utf8');

content += `\n
export async function copyMenuFromMainBranch(restaurantId: string, targetBranchId: string) {
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (!branches || branches.length === 0) throw new Error("No branches found");
  const mainBranchId = branches[0].id;
  
  if (mainBranchId === targetBranchId) throw new Error("Ya estás en la sucursal principal.");

  // Delete existing categories and products in target branch
  await supabaseAdmin.from('products').delete().eq('branch_id', targetBranchId);
  await supabaseAdmin.from('categories').delete().eq('branch_id', targetBranchId);

  // Fetch categories from main
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('branch_id', mainBranchId);

  if (!categories || categories.length === 0) return { success: true };

  for (const cat of categories) {
    const { id, created_at, updated_at, branch_id, ...rest } = cat;
    const { data: newCat } = await supabaseAdmin
      .from('categories')
      .insert({ ...rest, branch_id: targetBranchId })
      .select('id').single();
      
    if (newCat) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('category_id', cat.id);
        
      if (products && products.length > 0) {
         for (const prod of products) {
           const { id: pid, created_at: pcr, updated_at: pup, branch_id: pbr, category_id: pcid, ...prest } = prod;
           await supabaseAdmin.from('products').insert({
              ...prest,
              category_id: newCat.id,
              branch_id: targetBranchId
           });
         }
      }
    }
  }
  return { success: true };
}
`;

fs.writeFileSync(file, content);
