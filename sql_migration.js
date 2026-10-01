const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      ALTER TABLE public.kitchen_stations
      ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

      ALTER TABLE public.branches
      ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
      ADD COLUMN IF NOT EXISTS operating_hours JSONB;
    `
  });
  
  if (error) {
    console.error('RPC failed, trying raw query via pg...', error);
  } else {
    console.log('Success!', data);
  }
}
run();
