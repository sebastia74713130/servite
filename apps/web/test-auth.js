const crypto = require('crypto');
const axios = require('axios'); // We can use fetch

const BANECO_API_URL = 'https://apimkt.baneco.com.bo/apiGateway';
const BANECO_USER = 'A125834320';
const keyString = '8B473BF5A7684F16BB00719D9C57D837';
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

function encrypt(text, keyString, encoding, algo) {
  const key = Buffer.from(keyString, encoding);
  const cipher = crypto.createCipheriv(algo, key, null);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

async function run() {
  const p1 = encrypt(passString, keyString, 'utf8', 'aes-256-ecb');
  await tryAuth(p1, 'AES-256-ECB utf8 key');
  
  // Try treating key as hex -> 16 bytes -> aes-128-ecb
  try {
    const p2 = encrypt(passString, keyString, 'hex', 'aes-128-ecb');
    await tryAuth(p2, 'AES-128-ECB hex key');
  } catch(e) { console.log(e.message) }

  // Try treating key as hex -> zero padded?
}

run();
