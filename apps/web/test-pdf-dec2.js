const crypto = require('crypto');

const cipherText = 'gmcqdMrrZsg1k7BZPgHC+95EINE073qdT8llUklDEcM=';
const keyString = '40A318B299F245C2B697176723088629';

const key = Buffer.from(keyString, 'utf8');
const buf = Buffer.from(cipherText, 'base64');
const iv = buf.slice(0, 16);
const text = buf.slice(16).toString('base64');

const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
let decrypted = decipher.update(text, 'base64', 'utf8');
decrypted += decipher.final('utf8');
console.log("Decrypted password:", decrypted);
