const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// We will test if we can update a row to see if page_background_color exists.
// Wait, ANON_KEY doesn't have DDL permissions (ALTER TABLE).
// I will just use the REST API via fetch, or see if I can get service role key.
// But wait, there might be a postgres function `execute_sql`? No, probably not.
// Maybe I can just repurpose an existing column? No.

console.log(process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Has service key' : 'No service key');
