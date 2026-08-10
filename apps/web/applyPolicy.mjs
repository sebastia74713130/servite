import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whcgetmvlhysrhkyxupz.supabase.co';
const supabaseKey = 'sb_secret_Oo1xQmBsfxbJYVO9iUFd9A_dVzL4rHk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: `
      ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'dine_in' CHECK (type IN ('dine_in', 'takeaway'));
    `
  });
  
  if (error) {
    console.error('Error applying schema:', error);
  } else {
    console.log('Schema applied successfully!');
  }
}

run();
