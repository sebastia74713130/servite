const crypto = require('crypto');

// Bank APIs
const encryptUrl = 'https://apimkt.baneco.com.bo/apiGateway/api/authentication/encrypt';
const decryptUrl = 'https://apimkt.baneco.com.bo/apiGateway/api/authentication/decrypt';

// Test Data
const plainText = '123456789';
const aesKeyString = '40A318B299F245C2B697176723088629';

// --- NODE.JS NATIVE ENCRYPT ---
function nodeEncrypt(text, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

// --- NODE.JS NATIVE DECRYPT ---
function nodeDecrypt(base64Data, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  const targetBuffer = Buffer.from(base64Data, 'base64');
  const iv = targetBuffer.slice(0, 16);
  const encrypted = targetBuffer.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

async function runTests() {
  console.log("=== PRUEBA DE ENCRIPTACIÓN DE PUNTA A PUNTA CON BANCO ECONÓMICO ===\n");
  
  // 1. We encrypt with Node.js, ask Bank to decrypt
  console.log("1. SERVIDO Encripta -> BANCO Desencripta");
  const myEncrypted = nodeEncrypt(plainText, aesKeyString);
  console.log("   Texto Original a encriptar:", plainText);
  console.log("   NUESTRO SISTEMA generó el Base64:", myEncrypted);
  
  const encodedMyEncrypted = encodeURIComponent(myEncrypted);
  const req1 = await fetch(`${decryptUrl}?text=${encodedMyEncrypted}&aesKey=${aesKeyString}`);
  const bankDecryptedRaw = await req1.text();
  const bankDecrypted = bankDecryptedRaw.replace(/['"]+/g, '').trim(); 
  
  console.log("   EL BANCO respondió des-encriptando:", bankDecrypted);
  console.log(bankDecrypted === plainText ? "   ÉXITO \n" : "   FALLÓ\n");

  // 2. Ask Bank to encrypt, we decrypt with Node.js
  console.log("2. BANCO Encripta -> SERVIDO Desencripta");
  const req2 = await fetch(`${encryptUrl}?text=${plainText}&aesKey=${aesKeyString}`);
  const bankEncryptedRaw = await req2.text();
  const bankEncrypted = bankEncryptedRaw.replace(/['"]+/g, '').trim(); 
  console.log("   EL BANCO generó el Base64:", bankEncrypted);
  
  try {
    const myDecrypted = nodeDecrypt(bankEncrypted, aesKeyString);
    console.log("   NUESTRO SISTEMA respondió des-encriptando:", myDecrypted);
    console.log(myDecrypted === plainText ? "   ÉXITO \n" : " FALLÓ\n");
  } catch (e) {
    console.log("   ❌ FALLÓ la desencriptación en nuestro sistema:", e.message, "\n");
  }
}

runTests();
