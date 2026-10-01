const fs = require('fs');
const file = 'apps/web/src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add branch to useRestaurantSession
content = content.replace(
  "const { restaurant, role } = useRestaurantSession();",
  "const { restaurant, branch, role } = useRestaurantSession();"
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

// 3. Add branch filter to fetchPendingReservations
content = content.replace(
  /const fetchPendingReservations = async \(\) => \{\n\s*const today = new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\];\n\s*const \{ data \} = await supabase\n\s*\.from\('reservations'\)\n\s*\.select\('id'\)\n\s*\.eq\('restaurant_id', restaurant\.id\)\n\s*\.eq\('status', 'pending'\)\n\s*\.gte\('reservation_date', today\);/,
  `const fetchPendingReservations = async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('reservations')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'pending')
        .gte('reservation_date', today);
      if (branch?.id) query = query.eq('branch_id', branch.id);
      const { data } = await query;`
);

// 4. Change badge color from red-500 to orange-500
content = content.replace(
  /bg-red-500/g,
  "bg-orange-500" // There are two bg-red-500, one for the notification bar and one for the badge. Wait, the user said "la notificacion de color rojo en reservas debe ser de color naranja y tambien debe estar aislada respecto a su sucursal, aplica lo mismo para cualquier modulo que tenga esta notificacion". They mean the badge!
);

fs.writeFileSync(file, content);
