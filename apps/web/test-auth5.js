const crypto = require('crypto');

const BANECO_API_URL = 'https://apimkt.baneco.com.bo/apiGateway';
const BANECO_USER = 'A125834320';

async function tryAuth(passwordEnc, label) {
  const res = await fetch(`${BANECO_API_URL}/api/authentication/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: BANECO_USER,
      password: passwordEnc
    })
  });
  const data = await res.json();
  console.log(`[${label}]`, data.responseCode, data.message);
}

async function run() {
  const randomBytes = crypto.randomBytes(16).toString('base64');
  await tryAuth(randomBytes, 'Random 16 bytes');
  
  const randomBytes32 = crypto.randomBytes(32).toString('base64');
  await tryAuth(randomBytes32, 'Random 32 bytes');
}

run();
