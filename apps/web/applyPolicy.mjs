import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whcgetmvlhysrhkyxupz.supabase.co';
const supabaseKey = 'sb_secret_Oo1xQmBsfxbJYVO9iUFd9A_dVzL4rHk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: 'CREATE POLICY "Public can update tables" ON public.tables FOR UPDATE USING (true);'
  });
  
  if (error) {
    console.error('Error applying policy:', error);
  } else {
    console.log('Policy applied successfully!');
  }
}

run();
