const crypto = require('crypto');

const BANECO_API_URL = (process.env.BANECO_API_URL || "https://bancadigital.bancoeconomico.com.bo").replace(/\/$/, "");
const BANECO_USER = process.env.BANECO_USER;
const BANECO_PASSWORD_ENC = process.env.BANECO_PASSWORD_ENC;
const BANECO_AES_KEY = process.env.BANECO_AES_KEY;

if (!BANECO_USER || !BANECO_PASSWORD_ENC) {
  console.error("Faltan variables de entorno BANECO_USER o BANECO_PASSWORD_ENC en apps/web/.env.local");
  process.exit(1);
}

async function testAuth() {
  console.log("Iniciando prueba de autenticación con Banco Económico...");
  console.log("URL:", BANECO_API_URL + "/api/authentication/authenticate");
  console.log("Usuario:", BANECO_USER);
  console.log("Password Encriptado (Base64):", BANECO_PASSWORD_ENC);
  
  try {
    const res = await fetch(`${BANECO_API_URL}/api/authentication/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: BANECO_USER,
        password: BANECO_PASSWORD_ENC
      })
    });
    
    console.log("\n--- RESPUESTA HTTP ---");
    console.log("Status:", res.status, res.statusText);
    
    const text = await res.text();
    console.log("Body:", text);
    
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

testAuth();
