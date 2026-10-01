const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/reservations/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update fetchDatesWithReservations
const oldFetchDates = `const { data } = await supabase
        .from('reservations')
        .select('reservation_date')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled');`;
        
const newFetchDates = `let query = supabase
        .from('reservations')
        .select('reservation_date')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled');
        if (branch?.id) query = query.eq('branch_id', branch.id);
      const { data } = await query;`;
      
content = content.replace(oldFetchDates, newFetchDates);

// Update dependencies
content = content.replace("}, [restaurant?.id]);", "}, [restaurant?.id, branch?.id]);");

// Update useReservations call
content = content.replace(
  "const { reservations, loading: reservationsLoading, refetch } = useReservations(restaurant?.id, selectedDate);",
  "const { reservations, loading: reservationsLoading, refetch } = useReservations(restaurant?.id, branch?.id, selectedDate);"
);

fs.writeFileSync(file, content);
