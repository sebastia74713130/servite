const crypto = require('crypto');

function encryptPassword(password, keyString) {
  const key = Buffer.from(keyString, 'utf8');

  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

const NEW_PASSWORD = "ProdAlba11";
const AES_KEY = "8B473BF5A7684F16BB00719D9C57D837";

console.log("Contraseña encriptada en Base64:");
console.log(encryptPassword(NEW_PASSWORD, AES_KEY));
