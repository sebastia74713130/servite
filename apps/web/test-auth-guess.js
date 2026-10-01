const crypto = require('crypto');

const BANECO_API_URL = 'https://apimkt.baneco.com.bo/apiGateway';
const BANECO_USER = 'A125834320';
const keyString = '8B473BF5A7684F16BB00719D9C57D837';

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
  return data.responseCode === 0;
}

function encrypt(text, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

async function run() {
  const guesses = [
    BANECO_USER,
    BANECO_USER.toLowerCase(),
    '123456',
    '12345678',
    'password',
    '12345',
    'admin',
    keyString
  ];

  for (const guess of guesses) {
    const enc = encrypt(guess, keyString);
    const success = await tryAuth(enc, `Guess: ${guess}`);
    if (success) {
      console.log('SUCCESS FOUND: ', guess);
      return;
    }
  }
}

run();
