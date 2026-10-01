const crypto = require('crypto');
const url = 'https://apimkt.baneco.com.bo/apiGateway/api/authentication/authenticate';
const user = 'A125834320';
const passwordPlain = 'Trupuadd541';
const aesKeyString = '8B473BF5A7684F16BB00719D9C57D837';

const key = Buffer.from(aesKeyString, 'utf8');
const iv = Buffer.alloc(16, 0); // zero IV
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([cipher.update(passwordPlain, 'utf8'), cipher.final()]);
const passwordEncrypted = encrypted.toString('base64'); // Only ciphertext!

console.log("CBC Zero IV Encrypted:", passwordEncrypted);

async function test() {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: user, password: passwordEncrypted })
  });
  console.log("Status HTTP:", response.status, response.statusText);
  const data = await response.text();
  console.log("Respuesta:", data);
}

test();
