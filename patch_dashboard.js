const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add branch to useRestaurantSession and useDashboardStats
content = content.replace(
  "const { restaurant, loading: sessionLoading } = useRestaurantSession();",
  "const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();"
);
content = content.replace(
  "const { stats, loading: statsLoading } = useDashboardStats(restaurant?.id);",
  "const { stats, loading: statsLoading } = useDashboardStats(restaurant?.id, branch?.id);"
);

// 2. Add branch filter to fetchCalling
content = content.replace(
  /const fetchCalling = async \(\) => \{\n\s*const \{ data \} = await supabase\n\s*\.from\('tables'\)\n\s*\.select\('service_status'\)\n\s*\.eq\('restaurant_id', restaurant\.id\);/,
  `const fetchCalling = async () => {
      let query = supabase
        .from('tables')
        .select('service_status')
        .eq('restaurant_id', restaurant.id);
      if (branch?.id) query = query.eq('branch_id', branch.id);
      const { data } = await query;`
);

fs.writeFileSync(file, content);
