const { execSync } = require('child_process');

const key = "GEMINI_API_KEY";
const value = "AQ.Ab8RN6K5T1Vu6Bw4SkqqHOkDfRwSWpDRTe_BkmD97fgjHd3dMg";
const envs = ["production", "preview", "development"];

for (const env of envs) {
  try {
    console.log(`Adding to ${env}...`);
    execSync(`npx vercel env add ${key} ${env}`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (e) {
    console.error(`Failed to add to ${env}`);
  }
}
