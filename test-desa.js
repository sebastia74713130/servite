const crypto = require('crypto');
const url = 'https://apimktdesa.bancavive.com.bo/ApiGateway/api/authentication/authenticate';
const user = '26551010';
const passwordPlain = '1234';
const aesKeyString = '40A318B299F245C2B697176723088629';

const key = Buffer.from(aesKeyString, 'utf8');
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([cipher.update(passwordPlain, 'utf8'), cipher.final()]);
const passwordEncrypted = Buffer.concat([iv, encrypted]).toString('base64');

async function test() {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: user, password: passwordEncrypted })
  });
  const data = await response.text();
  console.log("Status HTTP:", response.status);
  console.log("Respuesta:", data);
}

test();
