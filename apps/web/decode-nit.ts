import * as zlib from 'zlib';

const base64Str = 'H4sIAAAAAAAAADOztDA3NzcwMgUAzOgGQgkAAAA=';
const buffer = Buffer.from(base64Str, 'base64');
const decompressed = zlib.gunzipSync(buffer);
console.log("NIT PROVEEDOR:", decompressed.toString());
