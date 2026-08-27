const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://whcgetmvlhysrhkyxupz.supabase.co";
const supabaseAnonKey = "sb_publishable_0SRPKJUxTa5LeXkc1jvBvQ_sryMtXTg";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function test() {
  console.log("Testing ANON connection...");
  const { data, error } = await supabase
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
