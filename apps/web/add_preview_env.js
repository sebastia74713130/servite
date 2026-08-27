const fs = require('fs');
const { execSync } = require('child_process');

const envVars = {
  "NEXT_PUBLIC_SUPABASE_URL": "https://whcgetmvlhysrhkyxupz.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_0SRPKJUxTa5LeXkc1jvBvQ_sryMtXTg",
  "SUPABASE_SERVICE_ROLE_KEY": "sb_secret_Oo1xQmBsfxbJYVO9iUFd9A_dVzL4rHk"
};

for (const [key, value] of Object.entries(envVars)) {
  fs.writeFileSync('temp_val.txt', value);
  try {
    console.log(`Adding ${key} to preview for branch andres/facturacion...`);
    execSync(`npx vercel env add ${key} preview andres/facturacion < temp_val.txt`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Failed to add ${key}`);
  }
}
fs.unlinkSync('temp_val.txt');
