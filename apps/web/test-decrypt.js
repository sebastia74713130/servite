const crypto = require('crypto');
const aesKeyString = '40A318B299F245C2B697176723088629';
const key = Buffer.from(aesKeyString, 'utf8');

const targetBase64 = 'gmcqdMrrZsg1k7BZPgHC+95EINE073qdT8llUklDEcM=';
const targetBuffer = Buffer.from(targetBase64, 'base64');
console.log("Total length:", targetBuffer.length);

const iv = targetBuffer.slice(0, 16);
const encrypted = targetBuffer.slice(16);

try {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  // Auto-padding enabled by default
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  console.log("Decrypted CBC:", decrypted.toString('utf8'));
} catch (e) {
  console.error("CBC Decryption failed:", e.message);
}

// What if it's ECB mode and the IV is missing, or something else?
try {
  const decipher2 = crypto.createDecipheriv('aes-256-ecb', key, null);
  decipher2.setAutoPadding(false);
  const decrypted2 = Buffer.concat([decipher2.update(targetBuffer), decipher2.final()]);
  console.log("Decrypted ECB:", decrypted2.toString('utf8'));
} catch (e) {
  console.error("ECB Decryption failed:", e.message);
}
