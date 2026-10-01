const crypto = require('crypto');

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

function encryptCBC(text, keyString, encoding, algo) {
  const key = Buffer.from(keyString, encoding);
  const iv = Buffer.alloc(16, 0); // zero IV
  const cipher = crypto.createCipheriv(algo, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

async function run() {
  const p1 = encryptCBC(passString, keyString, 'utf8', 'aes-256-cbc');
  await tryAuth(p1, 'AES-256-CBC zero iv utf8 key');
  
  const p2 = encryptCBC(passString, keyString, 'hex', 'aes-128-cbc');
  await tryAuth(p2, 'AES-128-CBC zero iv hex key');
}

run();
