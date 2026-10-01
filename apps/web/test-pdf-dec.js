const crypto = require('crypto');

const expected = 'KJAzqjmwjxIOqVo5J3IH0/7fGmNdzuyszrlqexVSeos=';
const keyString = '40A318B299F245C2B697176723088629';

function tryDecrypt(cipherText, keyString, encoding, algo) {
  try {
    const key = Buffer.from(keyString, encoding);
    let iv = null;
    let text = cipherText;
    
    // Check if CBC where IV is first 16 bytes
    if (algo.includes('cbc')) {
       const buf = Buffer.from(cipherText, 'base64');
       iv = buf.slice(0, 16);
       text = buf.slice(16).toString('base64');
    }
    
    const decipher = crypto.createDecipheriv(algo, key, iv);
    decipher.setAutoPadding(false); // don't crash on padding error
    let decrypted = decipher.update(text, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    console.log(`[${algo} ${encoding}] Decrypted:`, decrypted, Buffer.from(decrypted, 'utf8').toString('hex'));
  } catch(e) {
    console.log(`[${algo} ${encoding}] Error:`, e.message);
  }
}

tryDecrypt(expected, keyString, 'utf8', 'aes-256-ecb');
tryDecrypt(expected, keyString, 'hex', 'aes-128-ecb');
tryDecrypt(expected, keyString, 'utf8', 'aes-256-cbc');
tryDecrypt(expected, keyString, 'hex', 'aes-128-cbc');

