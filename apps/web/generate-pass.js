const crypto = require('crypto');

const keyString = '8B473BF5A7684F16BB00719D9C57D837';
const text = 'Trupuadd541';

const key = Buffer.from(keyString, 'utf8');
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
const result = Buffer.concat([iv, encrypted]).toString('base64');
console.log(result);
