import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whcgetmvlhysrhkyxupz.supabase.co';
const supabaseKey = 'sb_secret_Oo1xQmBsfxbJYVO9iUFd9A_dVzL4rHk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('subsections').select('*').limit(5);
  console.log("Data:", data);
  console.log("Error:", error);
}

checkSchema();
