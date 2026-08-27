const fs = require('fs');
const { execSync } = require('child_process');

const envVars = {
  "NEXT_PUBLIC_SUPABASE_URL": "https://whcgetmvlhysrhkyxupz.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_0SRPKJUxTa5LeXkc1jvBvQ_sryMtXTg",
  "SUPABASE_SERVICE_ROLE_KEY": "sb_secret_Oo1xQmBsfxbJYVO9iUFd9A_dVzL4rHk"
};

const envs = ["production", "preview", "development"];

for (const key of Object.keys(envVars)) {
  for (const env of envs) {
    try {
      console.log(`Removing ${key} from ${env}...`);
      execSync(`npx vercel env rm ${key} ${env} -y`, { stdio: 'ignore' });
    } catch (e) {
      // Ignore errors if it doesn't exist
    }
  }
}

for (const [key, value] of Object.entries(envVars)) {
  fs.writeFileSync('temp_val.txt', value);
  for (const env of envs) {
    try {
      console.log(`Adding ${key} to ${env}...`);
      execSync(`npx vercel env add ${key} ${env} < temp_val.txt`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to add ${key} to ${env}`);
    }
  }
}
fs.unlinkSync('temp_val.txt');
