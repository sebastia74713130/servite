const crypto = require('crypto');

const BANECO_API_URL = 'https://apimkt.baneco.com.bo/apiGateway';
const BANECO_USER = 'A125834320';
const passString = 'Trupuadd541';

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
  const pBase64 = Buffer.from(passString).toString('base64');
  await tryAuth(pBase64, 'Raw Password Base64');
}

run();
