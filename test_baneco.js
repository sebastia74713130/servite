async function test() {
  const BANECO_API_URL = "https://apimkt.baneco.com.bo/apiGateway";
  const BANECO_USER = "A125834320";
  const BANECO_PASSWORD_ENC = "g9YNZ7kU/ZEXq18ZaWBfLw==";
  
  try {
    const res = await fetch(`${BANECO_API_URL}/api/authentication/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: BANECO_USER,
        password: BANECO_PASSWORD_ENC
      })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();
