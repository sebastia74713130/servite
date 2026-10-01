const crypto = require('crypto');

const keyString = '40A318B299F245C2B697176723088629';
const text = '1234';
const expected = 'KJAzqjmwjxIOqVo5J3IH0/7fGmNdzuyszrlqexVSeos=';

function encryptUtf8(text, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function encryptHex(text, keyString) {
  const key = Buffer.from(keyString, 'hex'); // 16 bytes -> AES-128
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

console.log("UTF8 ->", encryptUtf8(text, keyString));
console.log("HEX  ->", encryptHex(text, keyString));
console.log("EXPECTED ->", expected);
