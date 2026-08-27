const fs = require('fs');

const envLocalPath = '.env.local';
let envContent = '';

if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
}

const siatEnv = `
SIAT_TOKEN_DELEGADO="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJrZW5uZXRoYm9uaWxsYWJib0BnbWFpbC5jb20iLCJjb2RpZ29TaXN0ZW1hIjoiMjI4NDlGRjk0RkI3MkMzQjY1N0RGIiwibml0IjoiSDRzSUFBQUFBQUFBQURPenREQTNOemN3TWdVQXpPZ0dRZ2tBQUFBPSIsImlkIjo2MTEyNzYyLCJleHAiOjE4MTI4OTQyNzEsImlhdCI6MTc4NjQ3MDI0MSwibml0RGVsZWdhZG8iOjY5ODc3NzAyNSwic3Vic2lzdGVtYSI6IlNGRSJ9.eB-cLYHMQt72da3HU8eXzaAQgdv74Vax0pNgtD1tCoMWht3MaVqKGBAJm1upOczbOTtKjR5WnbOOuhSfqbhPLA"
SIAT_CODIGO_SISTEMA="22849FF94FB72C3B657DF"
`;

if (!envContent.includes('SIAT_TOKEN_DELEGADO')) {
  fs.appendFileSync(envLocalPath, '\n' + siatEnv.trim() + '\n');
  console.log('Added SIAT variables to .env.local');
} else {
  console.log('Variables already exist in .env.local');
}
