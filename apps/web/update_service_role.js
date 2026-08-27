const fs = require('fs');
const { execSync } = require('child_process');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoY2dldG12bGh5c3Joa3l4dXB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg0ODc0MiwiZXhwIjoyMDk4NDI0NzQyfQ.LsJEywgdNtin4Ax2mNY1_K12xgoXK2jZutnp3a6MQVk";

// Write to temp file
fs.writeFileSync('temp_key.txt', serviceRoleKey);

// Remove the old keys
const envs = ["production", "preview", "development"];
for (const env of envs) {
  try {
    console.log(`Removing SUPABASE_SERVICE_ROLE_KEY from ${env}...`);
    execSync(`npx vercel env rm SUPABASE_SERVICE_ROLE_KEY ${env} -y`, { stdio: 'ignore' });
  } catch (e) {}
}

// Add to production and development
for (const env of ["production", "development"]) {
  try {
    console.log(`Adding SUPABASE_SERVICE_ROLE_KEY to ${env}...`);
    execSync(`npx vercel env add SUPABASE_SERVICE_ROLE_KEY ${env} < temp_key.txt`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Failed to add to ${env}`);
  }
}

// Add to preview (specific branch)
try {
  console.log(`Adding SUPABASE_SERVICE_ROLE_KEY to preview (andres/facturacion)...`);
  execSync(`npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview andres/facturacion < temp_key.txt`, { stdio: 'inherit' });
} catch (e) {
  console.error(`Failed to add to preview`);
}

fs.unlinkSync('temp_key.txt');
