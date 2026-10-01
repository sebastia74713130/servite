const axios = require('axios'); // fallback to fetch

async function run() {
  const url = 'https://apimkt.baneco.com.bo/apiGateway/api/authentication/encrypt?text=Trupuadd541&aesKey=8B473BF5A7684F16BB00719D9C57D837';
  
  console.log("Calling:", url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
    
    if (res.status === 200 && text) {
      // Let's try to authenticate with the exact string the bank returned
      const authUrl = 'https://apimkt.baneco.com.bo/apiGateway/api/authentication/authenticate';
      const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: 'A125834320',
          password: text.replace(/"/g, '').trim()
        })
      });
      const authData = await authRes.json();
      console.log("Auth Response:", authData);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

run();
