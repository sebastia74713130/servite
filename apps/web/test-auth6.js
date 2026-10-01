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

function encrypt(text, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

async function run() {
  const k1 = '8B473BF5A7684F16BB00719D9C57D837'; // the real key
  const k2 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // fake key

  await tryAuth(encrypt(passString, k1), 'Real Key 32 bytes AES-256-ECB utf8');
  await tryAuth(encrypt(passString, k2), 'Fake Key 32 bytes AES-256-ECB utf8');
  
  // What if we don't pad?
  
}

run();
