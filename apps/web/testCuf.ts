const { generarCUF } = require('./src/lib/siat/crypto/cufGenerator');

// Probamos generar un CUF con datos de ejemplo
const testParams = {
  nit: "123456789",
  fechaEmision: new Date("2026-08-15T15:00:00Z"),
  sucursal: 0,
  modalidad: 1, 
  tipoEmision: 1, 
  tipoFactura: 1, 
  tipoDocumentoSector: 1, 
  numeroFactura: 1,
  puntoVenta: 0,
  codigoControlCufd: "4BDAEFD0AA1BF74" // El que obtuvimos del Hito 3
};

try {
  const cuf = generarCUF(testParams);
  console.log("Resultado del Test CUF:");
  console.log(cuf);
  if (cuf.length > 30) {
      console.log("✅ El CUF se generó correctamente.");
  }
} catch (error) {
  console.error("Error calculando el CUF:", error);
}
