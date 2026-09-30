const crypto = require('crypto');

const keyString = '8B473BF5A7684F16BB00719D9C57D837';

function encryptAesEcb(text, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

console.log(encryptAesEcb('Trupuadd541', keyString));
