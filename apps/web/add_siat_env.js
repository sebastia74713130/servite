const { execSync } = require('child_process');
const fs = require('fs');

const envs = [
  { key: 'SIAT_TOKEN_DELEGADO', val: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJrZW5uZXRoYm9uaWxsYWJib0BnbWFpbC5jb20iLCJjb2RpZ29TaXN0ZW1hIjoiMjI4NDlGRjk0RkI3MkMzQjY1N0RGIiwibml0IjoiSDRzSUFBQUFBQUFBQURPenREQTNOemN3TWdVQXpPZ0dRZ2tBQUFBPSIsImlkIjo2MTEyNzYyLCJleHAiOjE4MTI4OTQyNzEsImlhdCI6MTc4NjQ3MDI0MSwibml0RGVsZWdhZG8iOjY5ODc3NzAyNSwic3Vic2lzdGVtYSI6IlNGRSJ9.eB-cLYHMQt72da3HU8eXzaAQgdv74Vax0pNgtD1tCoMWht3MaVqKGBAJm1upOczbOTtKjR5WnbOOuhSfqbhPLA' },
  { key: 'SIAT_CODIGO_SISTEMA', val: '22849FF94FB72C3B657DF' }
];

for (const env of envs) {
  fs.writeFileSync('temp.txt', env.val);
  
  const targets = [
    ['production', 'production'],
    ['development', 'development'],
    ['preview', 'preview andres/facturacion']
  ];
  
  for (const [envName, addArgs] of targets) {
    // Intentar eliminar primero para evitar errores si ya existen
    try {
      console.log(`Removing ${env.key} from ${envName}...`);
      execSync(`npx vercel env rm ${env.key} ${envName} -y`, { stdio: 'ignore' });
    } catch (e) { /* ignore si no existe */ }
    
    // Agregar la variable
    try {
      console.log(`Adding ${env.key} to ${envName}...`);
      execSync(`npx vercel env add ${env.key} ${addArgs} < temp.txt`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to add ${env.key} to ${envName}`);
    }
  }
}

if (fs.existsSync('temp.txt')) fs.unlinkSync('temp.txt');
console.log("Environment variables uploaded successfully.");
