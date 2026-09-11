import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let token = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('SIAT_TOKEN_DELEGADO=')) {
    token = line.split('=')[1].replace(/"/g, '').trim();
  }
});

if (token) {
  const parts = token.split('.');
  if (parts.length > 1) {
    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    console.log("PAYLOAD JWT:");
    console.log(JSON.parse(payloadJson));
  }
}
