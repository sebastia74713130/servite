const crypto = require('crypto');

const BANECO_API_URL = 'https://apimkt.baneco.com.bo/apiGateway';
const BANECO_USER = 'A125834320';
const passwordEnc = 'yyIj8/nt2lZ+vhzmSapJEJXvN3u4PDnnTUVXapMtDDA=';

async function tryAuth() {
  const res = await fetch(`${BANECO_API_URL}/api/authentication/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: BANECO_USER,
      password: passwordEnc
    })
  });
  const data = await res.json();
  console.log(data);
}
tryAuth();
