/**
 * Calcula el dígito verificador usando el algoritmo Módulo 11 v.2.0
 * Requerido por el SIAT de Bolivia para generar el CUF.
 * 
 * @param pString Cadena numérica a la cual calcular el Modulo 11
 * @param numDig Numero de digitos verificadores a generar, el SIAT por defecto pide 1 para el CUF
 * @param limMult Limite de multiplicador, el SIAT usa 9 por defecto
 * @param x10 Si es true, añade el resultado a la cadena original y devuelve todo. False devuelve solo el digito.
 * @returns Digito(s) verificador(es) o la cadena original + verificadores.
 */
export function calcularModulo11(pString: string, numDig: number = 1, limMult: number = 9, x10: boolean = false): string {
  let cadenaOriginal = pString;
  let mult, suma, i, n, dig;
  
  if (!x10) numDig = 1;
  
  for (n = 1; n <= numDig; n++) {
      suma = 0;
      mult = 2;
      for (i = pString.length - 1; i >= 0; i--) {
          suma += (mult * parseInt(pString.substring(i, i + 1), 10));
          if (++mult > limMult) mult = 2;
      }
      if (x10) {
          dig = ((suma * 10) % 11) % 10;
      } else {
          dig = suma % 11;
      }
      
      if (dig === 10) {
          pString += "1";
      }
      else if (dig === 11) {
          pString += "0";
      } else {
          pString += dig.toString();
      }
  }
  
  // Extraemos y retornamos solamente los dígitos generados, o la cadena completa.
  return pString.substring(pString.length - numDig, pString.length);
}
