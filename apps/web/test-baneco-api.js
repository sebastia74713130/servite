const crypto = require('crypto');

const url = 'https://apimkt.baneco.com.bo/apiGateway/api/authentication/authenticate';
const user = 'A125834320';
const passwordPlain = 'Trupuadd541';
const aesKeyString = '8B473BF5A7684F16BB00719D9C57D837';

const key = Buffer.from(aesKeyString, 'utf8');
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([cipher.update(passwordPlain, 'utf8'), cipher.final()]);
const passwordEncrypted = Buffer.concat([iv, encrypted]).toString('base64');

console.log("PRUEBA DE API BANCO ECONÓMICO ");
console.log("Usuario:", user);
console.log("Password Encriptado:", passwordEncrypted);

async function test() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userName: user,
        password: passwordEncrypted
      })
    });
    
    console.log("\nStatus HTTP:", response.status, response.statusText);
    const data = await response.text();
    console.log("Respuesta:", data);
  } catch (e) {
    console.error("Error de red:", e);
  }
}

test();
