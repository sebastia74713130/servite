import { calcularModulo11 } from "./modulo11";

export interface CufParams {
  nit: string;
  fechaEmision: string; // Formato YYYY-MM-DDThh:mm:ss.SSS (Exactamente el que va al XML)
  sucursal: number;
  modalidad: number; // 1: Electrónica en Línea, 2: Computarizada en Línea
  tipoEmision: number; // 1: Online, 2: Offline
  tipoFactura: number; // 1: Factura con derecho a crédito fiscal
  tipoDocumentoSector: number; // 1: Compra Venta
  numeroFactura: number;
  puntoVenta: number;
  codigoControlCufd: string;
}

/**
 * Función auxiliar para rellenar con ceros a la izquierda
 */
const padZeros = (num: number | string, places: number) => String(num).padStart(places, '0');

/**
 * Convierte una fecha SIAT a la cadena numérica requerida: YYYYMMDDHHmmssSSS
 */
const formatDateForCuf = (dateStr: string): string => {
  // Ej: 2026-08-20T13:07:00.000 -> 20260820130700000
  return dateStr.replace(/[-T:\.]/g, "");
};

/**
 * Genera el Código Único de Factura (CUF).
 * Basado en las especificaciones matemáticas del SIAT Bolivia.
 */
export function generarCUF(params: CufParams): string {
  // 1. Armar la cadena gigante (ceros a la izquierda según especificación técnica)
  const nitPadding = padZeros(params.nit, 13);
  const fechaStr = formatDateForCuf(params.fechaEmision);
  const sucursalPadding = padZeros(params.sucursal, 4);
  const modalidadStr = params.modalidad.toString();
  const tipoEmisionStr = params.tipoEmision.toString();
  const tipoFacturaStr = params.tipoFactura.toString();
  const sectorPadding = padZeros(params.tipoDocumentoSector, 2);
  const numFacturaPadding = padZeros(params.numeroFactura, 10);
  const puntoVentaPadding = padZeros(params.puntoVenta, 4);

  let cadena = nitPadding + 
               fechaStr + 
               sucursalPadding + 
               modalidadStr + 
               tipoEmisionStr + 
               tipoFacturaStr + 
               sectorPadding + 
               numFacturaPadding + 
               puntoVentaPadding;

  // 2. Obtener Modulo 11
  const modulo11 = calcularModulo11(cadena, 1, 9, false);
  
  // 3. Concatenar Módulo 11 a la cadena original
  cadena = cadena + modulo11;

  // 4. Convertir a Base 16 (Hexadecimal)
  // Como la cadena tiene más de 40 dígitos, usamos BigInt para evitar pérdida de precisión.
  const bigIntCadena = BigInt(cadena);
  const base16 = bigIntCadena.toString(16).toUpperCase();

  // 5. Anexar el Código de Control del CUFD actual
  const cuf = base16 + params.codigoControlCufd;

  return cuf;
}
