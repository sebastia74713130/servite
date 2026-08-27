const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://whcgetmvlhysrhkyxupz.supabase.co";
const supabaseServiceRoleKey = "sb_secret_Oo1xQmBsfxbJYVO9iUFd9A_dVzL4rHk";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function test() {
  console.log("Testing connection...");
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .limit(1)
    .maybeSingle();
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

test();
