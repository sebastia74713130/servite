const crypto = require('crypto');
const BANECO_AES_KEY = '8B473BF5A7684F16BB00719D9C57D837';

function encryptAes(text, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  // Generate random 16-byte IV
  const iv = crypto.randomBytes(16);
  // Banco Economico PDF probably does NOT prepend the IV in the output. Wait...
  // Usually, banks provide a static IV, or IV=0000000000000000, or the ciphertext is CBC without prepending IV if they use ECB?
  // The PDF says "Algoritmo estandar AES, 256 bits, 32 bytes". It doesn't mention the IV!
  // If they don't mention IV, they might be using ECB mode (which doesn't use IV) or a fixed IV (like all zeros).
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

console.log("My encryption:", encryptAes("Trupuadd541", BANECO_AES_KEY));
