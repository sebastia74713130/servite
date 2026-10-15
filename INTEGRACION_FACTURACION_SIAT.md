# Guía de Integración: Sistema de Facturación Electrónica en Línea (SIAT Bolivia)

> **Documento técnico y operativo para replicar la integración del SIAT v2 (Modalidad Electrónica en Línea - Documento Sector 1: Compra-Venta) en cualquier proyecto basado en Node.js, Next.js / TypeScript y PostgreSQL / Supabase.**

---

## 📑 Tabla de Contenidos

1. [Visión General de la Arquitectura](#1-visión-general-de-la-arquitectura)
2. [Dependencias del Proyecto](#2-dependencias-del-proyecto)
3. [Variables de Entorno (`.env`)](#3-variables-de-entorno-env)
4. [Esquema de Base de Datos (SQL DDL)](#4-esquema-de-base-de-datos-sql-ddl)
5. [Estructura de Carpetas Recomendada](#5-estructura-de-carpetas-recomendada)
6. [Módulos Criptográficos y Algoritmos SIAT](#6-módulos-criptográficos-y-algoritmos-siat)
   - [6.1. Algoritmo Módulo 11 (`modulo11.ts`)](#61-algoritmo-módulo-11-modulo11ts)
   - [6.2. Generador del CUF (`cufGenerator.ts`)](#62-generador-del-cuf-cufgeneratorts)
   - [6.3. Extracción de Certificado `.p12` y Firma XML (`signer.ts`)](#63-extracción-de-certificado-p12-y-firma-xml-signerts)
7. [Construcción del XML de Factura (`invoiceBuilder.ts`)](#7-construcción-del-xml-de-factura-invoicebuilderts)
8. [Configuración y Conexión SOAP (`config.ts` y `soapClient.ts`)](#8-configuración-y-conexión-soap-configts-y-soapclientts)
9. [Servicios SOAP Esenciales](#9-servicios-soap-esenciales)
   - [9.1. Obtención del CUIS (`solicitarCUIS.ts`)](#91-obtención-del-cuis-solicitarcuists)
   - [9.2. Obtención Diaria del CUFD (`solicitarCUFD.ts`)](#92-obtención-diaria-del-cufd-solicitarcufdts)
   - [9.3. Sincronización de Catálogos (`sincronizarCatalogos.ts`)](#93-sincronización-de-catálogos-sincronizarcatalogosts)
   - [9.4. Emisión y Envío al SIAT (`emitirFactura.ts`)](#94-emisión-y-envío-al-siat-emitirfacturats)
10. [Ruta de Emisión API (`POST /api/siat/emitir`)](#10-ruta-de-emisión-api-post-apisiatemitir)
11. [Ruta de Anulación API (`POST /api/siat/anular`)](#11-ruta-de-anulación-api-post-apisiatanular)
12. [Representación Gráfica (Ticket / PDF) y Código QR Oficial](#12-representación-gráfica-ticket--pdf-y-código-qr-oficial)
13. [Manejo de Contingencias y Modo Offline](#13-manejo-de-contingencias-y-modo-offline)
14. [Checklist de Puesta en Marcha (Paso a Paso)](#14-checklist-de-puesta-en-marcha-paso-a-paso)
15. [Errores Comunes del SIAT y Soluciones](#15-errores-comunes-del-siat-y-soluciones)

---

## 1. Visión General de la Arquitectura

El **Servicio de Impuestos Nacionales (SIN)** de Bolivia utiliza el sistema **SIAT v2**. En la modalidad **Electrónica en Línea**:

```
[ Frontend / POS / Checkout ]
          │ (Datos de venta: Cliente, Items, Montos)
          ▼
[ Backend / API Route ]
  1. Consulta Credenciales & CUFD vigente (BD)
  2. Descarga Certificado .p12 y extrae PrivateKey + Certificado PEM
  3. Formatea fecha UTC-4 (Bolivia)
  4. Genera el CUF (Código Único de Factura) mediante Algoritmo Módulo 11 + Base16
  5. Construye el XML estándar (Compra-Venta Sector 1)
  6. Firma digitalmente el XML usando XMLDSig (RSA-SHA256)
  7. Comprime el XML firmado en GZIP y calcula su Hash SHA-256
  8. Envía vía SOAP (WSDL Compra-Venta) con autenticación por Token Delegado
          │
          ├── Si éxito (Código 904/908) ──> Guarda factura como 'VALIDADA'
          └── Si error de red o timeout ──> Regenera CUF (Offline), firma y guarda 'PENDIENTE_OFFLINE'
```

---

## 2. Dependencias del Proyecto

Instala las siguientes dependencias en tu proyecto:

```bash
npm install soap node-forge xml-crypto @xmldom/xmldom qrcode.react @supabase/supabase-js
npm install -D @types/node-forge
```

### Justificación de cada librería:
- **`soap`**: Cliente para consumir los Web Services SOAP del SIAT.
- **`node-forge`**: Librería criptográfica en JavaScript para abrir y desencriptar archivos `.p12` / `.pfx` (PKCS#12) y extraer llaves privadas y certificados X.509 en formato PEM.
- **`xml-crypto`**: Implementación estándar de XMLDSig para firmar digitalmente el documento XML con el estándar W3C (`rsa-sha256`, `xml-exc-c14n#`, enveloped signature).
- **`@xmldom/xmldom`**: Parser y manipulador de DOM para XML en entornos Node.js.
- **`qrcode.react`**: Para generar el código QR tributario en tickets térmicos de 80mm o reportes PDF.

---

## 3. Variables de Entorno (`.env`)

Agrega a tu archivo `.env` o `.env.local`:

```env
# Ambiente SIAT: 1 = Producción, 2 = Piloto / Pruebas
SIAT_AMBIENTE=2

# Credenciales maestras del Proveedor de Software (asignadas por el SIN)
SIAT_CODIGO_SISTEMA="TU_CODIGO_DE_SISTEMA_SIN"
SIAT_TOKEN_DELEGADO="TU_TOKEN_DELEGADO_APIKEY"
SIAT_NIT="123456789" # NIT emisor por defecto o matriz

# Clave secreta para endpoints de cronjobs de sincronización
CRON_SECRET="una_clave_secreta_para_tus_crons"
```

---

## 4. Esquema de Base de Datos (SQL DDL)

Ejecuta el siguiente script SQL en tu base de datos PostgreSQL / Supabase:

```sql
-- 1. Configuración SIAT por Negocio / Empresa / Restaurante
CREATE TABLE IF NOT EXISTS public.restaurant_siat_settings (
    restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    siat_nit TEXT NOT NULL,
    siat_codigo_sucursal INTEGER DEFAULT 0,
    siat_codigo_punto_venta INTEGER DEFAULT 0,
    siat_cert_password TEXT NOT NULL,
    siat_cuis TEXT,
    siat_cufd TEXT,
    siat_codigo_control_cufd TEXT,
    cufd_fecha_vigencia TIMESTAMP WITH TIME ZONE,
    siat_actividad_economica TEXT DEFAULT '561000',
    siat_codigo_producto_sin INTEGER DEFAULT 99100,
    siat_cafc TEXT, -- Código de Autorización de Facturas por Contingencia (opcional)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Historial y Registro de Facturas Emitidas
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID, -- Referencia a la orden/venta
    branch_id UUID, -- Referencia a la sucursal (si aplica)
    cuf TEXT NOT NULL UNIQUE,
    numero_factura INTEGER NOT NULL,
    xml_signed TEXT, -- XML firmado digitalmente
    siat_estado TEXT DEFAULT 'PENDIENTE', -- VALIDADA, OBSERVADA, RECHAZADA, ANULADA, PENDIENTE_OFFLINE
    codigo_recepcion TEXT,
    detalles_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_cuf ON public.invoices(cuf);
CREATE INDEX IF NOT EXISTS idx_invoices_restaurant ON public.invoices(restaurant_id);

-- 3. Bucket de almacenamiento seguro para los certificados digitales (.p12)
-- En Supabase: crear el bucket privado 'siat_certificates'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'siat_certificates',
  'siat_certificates',
  false, -- Privado: nadie puede descargarlo vía HTTP público
  5242880, -- Límite de 5 MB
  ARRAY['application/x-pkcs12', 'application/octet-stream']
) ON CONFLICT (id) DO NOTHING;
```

> **Convención de almacenamiento de certificados:**  
> Guardar el certificado en el bucket en la ruta: `{restaurantId}/cert.p12`.

---

## 5. Estructura de Carpetas Recomendada

Organiza tu código en la siguiente estructura dentro de `src/`:

```
src/
├── lib/
│   └── siat/
│       ├── config.ts                    # URLs y endpoints del SIAT (Piloto/Producción)
│       ├── soapClient.ts                # Cliente SOAP genérico con auth de cabecera
│       ├── branchHelper.ts              # Resolución de sucursal / punto de venta
│       ├── crypto/
│       │   ├── modulo11.ts              # Algoritmo de dígito verificador Módulo 11
│       │   ├── cufGenerator.ts          # Generador del CUF con BigInt
│       │   └── signer.ts                # Desencriptación de .p12 y firma XMLDSig
│       ├── xml/
│       │   └── invoiceBuilder.ts        # Armado de estructura XML oficial
│       └── services/
│           ├── solicitarCUIS.ts         # Servicio para obtener CUIS
│           ├── solicitarCUFD.ts         # Servicio para obtener CUFD diario
│           ├── sincronizarCatalogos.ts  # Homologación de Actividades y Productos SIN
│           └── emitirFactura.ts         # GZIP, Hash SHA256 y envío SOAP
├── app/
│   └── api/
│       └── siat/
│           ├── cuis/route.ts            # Endpoint para solicitar/renovar CUIS
│           ├── cufd/route.ts            # Endpoint para renovar CUFD diario
│           ├── sincronizar/route.ts     # Sincronización de catálogos
│           ├── emitir/route.ts          # Endpoint principal de emisión
│           ├── anular/route.ts          # Endpoint de anulación de facturas
│           └── factura/print/route.ts   # Renderizado HTML para impresión (Ticket 80mm)
```

---

## 6. Módulos Criptográficos y Algoritmos SIAT

### 6.1. Algoritmo Módulo 11 (`src/lib/siat/crypto/modulo11.ts`)

Requerido estrictamente por el SIN para generar el dígito verificador que forma parte del CUF.

```typescript
/**
 * Calcula el dígito verificador usando el algoritmo Módulo 11 v.2.0 (SIAT Bolivia).
 */
export function calcularModulo11(pString: string, numDig: number = 1, limMult: number = 9, x10: boolean = false): string {
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
    } else if (dig === 11) {
      pString += "0";
    } else {
      pString += dig.toString();
    }
  }

  return pString.substring(pString.length - numDig, pString.length);
}
```

---

### 6.2. Generador del CUF (`src/lib/siat/crypto/cufGenerator.ts`)

El **CUF** es un valor hexadecimal único de 40+ caracteres que vincula matemáticamente todos los metadatos de la factura con el código de control del CUFD del día.

```typescript
import { calcularModulo11 } from "./modulo11";

export interface CufParams {
  nit: string;
  fechaEmision: string; // Formato YYYY-MM-DDThh:mm:ss.SSS (Exactamente igual al XML)
  sucursal: number;
  modalidad: number;           // 1: Electrónica en Línea
  tipoEmision: number;         // 1: Online, 2: Offline
  tipoFactura: number;         // 1: Con derecho a crédito fiscal
  tipoDocumentoSector: number; // 1: Compra Venta
  numeroFactura: number;
  puntoVenta: number;
  codigoControlCufd: string;
}

const padZeros = (num: number | string, places: number) => String(num).padStart(places, '0');

const formatDateForCuf = (dateStr: string): string => {
  return dateStr.replace(/[-T:\.]/g, "");
};

export function generarCUF(params: CufParams): string {
  // 1. Armar la cadena con padding reglamentario
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

  // 2. Aplicar Módulo 11
  const modulo11 = calcularModulo11(cadena, 1, 9, false);
  cadena = cadena + modulo11;

  // 3. Convertir a Base 16 (Hexadecimal) usando BigInt para no perder precisión
  const bigIntCadena = BigInt(cadena);
  const base16 = bigIntCadena.toString(16).toUpperCase();

  // 4. Concatenar el Código de Control del CUFD diario
  const cuf = base16 + params.codigoControlCufd;

  return cuf;
}
```

---

### 6.3. Extracción de Certificado `.p12` y Firma XML (`src/lib/siat/crypto/signer.ts`)

```typescript
import * as forge from "node-forge";
import { SignedXml } from "xml-crypto";

/**
 * Desencripta el .p12 y extrae la llave privada y certificado en PEM.
 */
export function extractKeysFromP12(p12Buffer: Buffer, password: string) {
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

  let privateKeyPem = "";
  let certPem = "";

  const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBags = bags[forge.pki.oids.pkcs8ShroudedKeyBag];
  
  const certBagsObj = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBags = certBagsObj[forge.pki.oids.certBag];

  if (keyBags && keyBags.length > 0) {
    const privateKey = keyBags[0].key;
    privateKeyPem = forge.pki.privateKeyToPem(privateKey as forge.pki.PrivateKey);
  } else {
    throw new Error("No se encontró una llave privada en el archivo .p12");
  }

  if (certBags && certBags.length > 0) {
    const cert = certBags[0].cert;
    certPem = forge.pki.certificateToPem(cert as forge.pki.Certificate);
  } else {
    throw new Error("No se encontró un certificado en el archivo .p12");
  }

  return { privateKeyPem, certPem };
}

/**
 * Firma digitalmente un XML con XMLDSig Enveloped (RSA-SHA256).
 */
export function signXml(
  xmlString: string, 
  privateKeyPem: string, 
  certPem: string, 
  nodeName: string = "facturaElectronicaCompraVenta"
): string {
  const sig = new SignedXml();
  
  sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
  sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";

  sig.addReference({
    xpath: `//*[local-name(.)='${nodeName}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature", 
      "http://www.w3.org/2001/10/xml-exc-c14n#"
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    isEmptyUri: true
  } as any);

  sig.privateKey = privateKeyPem;
  sig.publicCert = certPem;
  sig.computeSignature(xmlString);
  
  return sig.getSignedXml();
}
```

---

## 7. Construcción del XML de Factura (`src/lib/siat/xml/invoiceBuilder.ts`)

```typescript
export interface FacturaDetalle {
  actividadEconomica: string;
  codigoProductoSin: number;
  codigoProducto: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: number; // Ej. 58 para Unidad
  precioUnitario: number;
  montoDescuento: number;
  subTotal: number;
  numeroSerie?: string;
  numeroImei?: string;
}

export interface FacturaCabecera {
  nitEmisor: string;
  razonSocialEmisor: string;
  municipio: string;
  telefono: string;
  numeroFactura: number;
  cuf: string;
  cufd: string;
  codigoSucursal: number;
  direccion: string;
  codigoPuntoVenta?: number;
  fechaEmision: string; // Formato YYYY-MM-DDThh:mm:ss.SSS (Hora Bolivia)
  nombreRazonSocial: string;
  codigoTipoDocumentoIdentidad: number; // 1: CI, 5: NIT
  numeroDocumento: string;
  complemento?: string;
  codigoCliente: string;
  codigoMetodoPago: number; // 1: Efectivo, 2: Tarjeta, etc.
  numeroTarjeta?: number;
  montoTotal: number;
  montoTotalSujetoIva: number;
  codigoMoneda: number; // 1: Boliviano
  tipoCambio: number;   // 1
  montoTotalMoneda: number;
  montoGiftCard?: number;
  descuentoAdicional?: number;
  codigoExcepcion?: number; // 1: Si el NIT no está empadronado en el SIN
  cafc?: string;            // Requerido en contingencia
  leyenda: string;
  usuario: string;
  codigoDocumentoSector: number; // 1: Compra Venta
}

export interface FacturaParams {
  cabecera: FacturaCabecera;
  detalle: FacturaDetalle[];
}

export function buildFacturaXml(params: FacturaParams): string {
  const { cabecera, detalle } = params;

  const detallesXml = detalle.map(d => `
      <detalle>
        <actividadEconomica>${d.actividadEconomica}</actividadEconomica>
        <codigoProductoSin>${d.codigoProductoSin}</codigoProductoSin>
        <codigoProducto>${d.codigoProducto}</codigoProducto>
        <descripcion>${d.descripcion}</descripcion>
        <cantidad>${d.cantidad}</cantidad>
        <unidadMedida>${d.unidadMedida}</unidadMedida>
        <precioUnitario>${d.precioUnitario}</precioUnitario>
        <montoDescuento>${d.montoDescuento}</montoDescuento>
        <subTotal>${d.subTotal}</subTotal>
        ${d.numeroSerie ? `<numeroSerie>${d.numeroSerie}</numeroSerie>` : `<numeroSerie xsi:nil="true"/>`}
        ${d.numeroImei ? `<numeroImei>${d.numeroImei}</numeroImei>` : `<numeroImei xsi:nil="true"/>`}
      </detalle>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<facturaElectronicaCompraVenta xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="facturaElectronicaCompraVenta.xsd">
  <cabecera>
    <nitEmisor>${cabecera.nitEmisor}</nitEmisor>
    <razonSocialEmisor>${cabecera.razonSocialEmisor}</razonSocialEmisor>
    <municipio>${cabecera.municipio}</municipio>
    <telefono>${cabecera.telefono}</telefono>
    <numeroFactura>${cabecera.numeroFactura}</numeroFactura>
    <cuf>${cabecera.cuf}</cuf>
    <cufd>${cabecera.cufd}</cufd>
    <codigoSucursal>${cabecera.codigoSucursal}</codigoSucursal>
    <direccion>${cabecera.direccion}</direccion>
    ${cabecera.codigoPuntoVenta !== undefined ? `<codigoPuntoVenta>${cabecera.codigoPuntoVenta}</codigoPuntoVenta>` : `<codigoPuntoVenta xsi:nil="true"/>`}
    <fechaEmision>${cabecera.fechaEmision}</fechaEmision>
    <nombreRazonSocial>${cabecera.nombreRazonSocial}</nombreRazonSocial>
    <codigoTipoDocumentoIdentidad>${cabecera.codigoTipoDocumentoIdentidad}</codigoTipoDocumentoIdentidad>
    <numeroDocumento>${cabecera.numeroDocumento}</numeroDocumento>
    ${cabecera.complemento ? `<complemento>${cabecera.complemento}</complemento>` : `<complemento xsi:nil="true"/>`}
    <codigoCliente>${cabecera.codigoCliente}</codigoCliente>
    <codigoMetodoPago>${cabecera.codigoMetodoPago}</codigoMetodoPago>
    ${cabecera.numeroTarjeta ? `<numeroTarjeta>${cabecera.numeroTarjeta}</numeroTarjeta>` : `<numeroTarjeta xsi:nil="true"/>`}
    <montoTotal>${cabecera.montoTotal}</montoTotal>
    <montoTotalSujetoIva>${cabecera.montoTotalSujetoIva}</montoTotalSujetoIva>
    <codigoMoneda>${cabecera.codigoMoneda}</codigoMoneda>
    <tipoCambio>${cabecera.tipoCambio}</tipoCambio>
    <montoTotalMoneda>${cabecera.montoTotalMoneda}</montoTotalMoneda>
    ${cabecera.montoGiftCard !== undefined ? `<montoGiftCard>${cabecera.montoGiftCard}</montoGiftCard>` : `<montoGiftCard xsi:nil="true"/>`}
    <descuentoAdicional>${cabecera.descuentoAdicional || 0}</descuentoAdicional>
    ${cabecera.codigoExcepcion !== undefined ? `<codigoExcepcion>${cabecera.codigoExcepcion}</codigoExcepcion>` : `<codigoExcepcion xsi:nil="true"/>`}
    ${cabecera.cafc ? `<cafc>${cabecera.cafc}</cafc>` : `<cafc xsi:nil="true"/>`}
    <leyenda>${cabecera.leyenda}</leyenda>
    <usuario>${cabecera.usuario}</usuario>
    <codigoDocumentoSector>${cabecera.codigoDocumentoSector}</codigoDocumentoSector>
  </cabecera>
  ${detallesXml}
</facturaElectronicaCompraVenta>`;
}
```

---

## 8. Configuración y Conexión SOAP (`config.ts` y `soapClient.ts`)

### `src/lib/siat/config.ts`
```typescript
export const siatConfig = {
  tokenDelegado: process.env.SIAT_TOKEN_DELEGADO || "",
  codigoSistema: process.env.SIAT_CODIGO_SISTEMA || "",
  nit: process.env.SIAT_NIT || "",
  ambiente: process.env.SIAT_AMBIENTE ? parseInt(process.env.SIAT_AMBIENTE, 10) : 2,
  
  get wsdlSincronizacion() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl";
  },
  get wsdlOperaciones() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl";
  },
  get wsdlCodigos() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/FacturacionCodigos?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl";
  },
  get wsdlCompraVenta() {
    return this.ambiente === 1
      ? "https://siatrest.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl"
      : "https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl";
  }
};
```

### `src/lib/siat/soapClient.ts`
```typescript
import * as soap from "soap";
import { siatConfig } from "./config";

export async function createSiatClient(wsdlUrl: string) {
  const client = await soap.createClientAsync(wsdlUrl);
  // Cabecera obligatoria de autenticación para todos los Web Services del SIAT
  client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);
  return client;
}
```

---

## 9. Servicios SOAP Esenciales

### 9.1. Obtención del CUIS (`src/lib/siat/services/solicitarCUIS.ts`)
El CUIS es el Código Único de Inicio de Sistema. Se solicita por sucursal y punto de venta.

```typescript
import { createSiatClient } from "../soapClient";
import { siatConfig } from "../config";

export async function solicitarCUIS(params: {
  nit: number;
  codigoSucursal?: number;
  codigoPuntoVenta?: number;
}) {
  const client = await createSiatClient(siatConfig.wsdlCodigos);
  const [result] = await client.cuisAsync({
    SolicitudCuis: {
      codigoAmbiente: siatConfig.ambiente,
      codigoModalidad: 1, // Electrónica en Línea
      codigoPuntoVenta: params.codigoPuntoVenta || 0,
      codigoSistema: siatConfig.codigoSistema,
      codigoSucursal: params.codigoSucursal || 0,
      nit: params.nit
    }
  });
  return result; // Retorna { RespuestaCuis: { codigo: "...", transaccion: true } }
}
```

---

### 9.2. Obtención Diaria del CUFD (`src/lib/siat/services/solicitarCUFD.ts`)
El **CUFD caduca cada 24 horas**. Retorna el código CUFD y su **código de control**, imprescindible para el CUF.

```typescript
import { createSiatClient } from "../soapClient";
import { siatConfig } from "../config";

export async function solicitarCUFD(params: {
  nit: number;
  cuis: string;
  codigoSucursal?: number;
  codigoPuntoVenta?: number;
}) {
  const client = await createSiatClient(siatConfig.wsdlCodigos);
  const [result] = await client.cufdAsync({
    SolicitudCufd: {
      codigoAmbiente: siatConfig.ambiente,
      codigoModalidad: 1,
      codigoPuntoVenta: params.codigoPuntoVenta || 0,
      codigoSistema: siatConfig.codigoSistema,
      codigoSucursal: params.codigoSucursal || 0,
      cuis: params.cuis,
      nit: params.nit
    }
  });
  return result; 
  // Retorna { RespuestaCufd: { codigo: "...", codigoControl: "...", fechaVigencia: "..." } }
}
```

---

### 9.3. Sincronización de Catálogos (`src/lib/siat/services/sincronizarCatalogos.ts`)

```typescript
import * as soap from "soap";
import { siatConfig } from "../config";

export async function sincronizarCatalogosSIAT(params: {
  nit: number;
  cuis: string;
  codigoSucursal: number;
  codigoPuntoVenta: number;
}) {
  const client = await soap.createClientAsync(siatConfig.wsdlSincronizacion);
  client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);

  const args = {
    SolicitudSincronizacion: {
      codigoAmbiente: siatConfig.ambiente,
      codigoPuntoVenta: params.codigoPuntoVenta,
      codigoSistema: siatConfig.codigoSistema,
      codigoSucursal: params.codigoSucursal,
      cuis: params.cuis,
      nit: params.nit
    }
  };

  // Obtener actividades y productos homologados
  const [actResult] = await client.sincronizarActividadesAsync(args);
  const [prodResult] = await client.sincronizarListaProductosServiciosAsync(args);

  const listaProductos = prodResult.RespuestaListaProductos?.listaCodigos;
  const primerProducto = Array.isArray(listaProductos) ? listaProductos[0] : listaProductos;

  return {
    actividad: primerProducto?.codigoActividad || "561000",
    producto: primerProducto?.codigoProducto || 99100
  };
}
```

---

### 9.4. Emisión y Envío al SIAT (`src/lib/siat/services/emitirFactura.ts`)

El SIN requiere que el XML firmado se comprima en **GZIP**, se calcule el **SHA-256** del archivo comprimido, y se envíe codificado en **Base64**.

```typescript
import * as soap from "soap";
import * as zlib from "zlib";
import * as crypto from "crypto";
import { siatConfig } from "../config";

export async function emitirFacturaSIAT(xmlFirmado: string, siatSettings: any) {
  // 1. Comprimir en GZIP
  const xmlBuffer = Buffer.from(xmlFirmado, "utf-8");
  const gzipBuffer = zlib.gzipSync(xmlBuffer);

  // 2. Hash SHA-256 del binario GZIP
  const hashArchivo = crypto.createHash("sha256").update(gzipBuffer).digest("hex");

  // 3. Convertir a Base64
  const archivoBase64 = gzipBuffer.toString("base64");

  // Fecha de envío en hora Bolivia (UTC-4)
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - 4);
  const fechaEnvio = d.toISOString().replace('Z', '');

  // 4. Payload SOAP
  const args = {
    SolicitudServicioRecepcionFactura: {
      codigoAmbiente: siatConfig.ambiente,
      codigoDocumentoSector: 1, // Compra Venta
      codigoEmision: 1,         // 1 = Online
      codigoModalidad: 1,       // 1 = Electrónica en Línea
      codigoPuntoVenta: parseInt(siatSettings.siat_codigo_punto_venta) || 0,
      codigoSistema: siatConfig.codigoSistema,
      codigoSucursal: parseInt(siatSettings.siat_codigo_sucursal) || 0,
      cufd: siatSettings.siat_cufd,
      cuis: siatSettings.siat_cuis,
      nit: parseInt(siatSettings.siat_nit),
      tipoFacturaDocumento: 1,  // Con derecho a crédito fiscal
      archivo: archivoBase64,
      fechaEnvio: fechaEnvio,
      hashArchivo: hashArchivo
    }
  };

  const client = await soap.createClientAsync(siatConfig.wsdlCompraVenta);
  client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);

  const [result] = await client.recepcionFacturaAsync(args);
  return result;
}
```

---

## 10. Ruta de Emisión API (`POST /api/siat/emitir`)

Crea `src/app/api/siat/emitir/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildFacturaXml } from "@/lib/siat/xml/invoiceBuilder";
import { extractKeysFromP12, signXml } from "@/lib/siat/crypto/signer";
import { generarCUF } from "@/lib/siat/crypto/cufGenerator";
import { emitirFacturaSIAT } from "@/lib/siat/services/emitirFactura";

export async function POST(req: Request) {
  try {
    const { restaurantId, orderId, facturaParams } = await req.json();

    // 1. Obtener ajustes SIAT del emisor
    const { data: siatSettings } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (!siatSettings || !siatSettings.siat_cuis || !siatSettings.siat_cufd) {
      return NextResponse.json({ error: "Configuración SIAT incompleta o sin CUFD activo" }, { status: 400 });
    }

    // 2. Descargar el certificado .p12 desde Storage
    const certPath = `${restaurantId}/cert.p12`;
    const { data: certBlob, error: storageError } = await supabaseAdmin.storage
      .from('siat_certificates')
      .download(certPath);

    if (storageError || !certBlob) {
      return NextResponse.json({ error: "Certificado digital no encontrado" }, { status: 404 });
    }

    const certBuffer = Buffer.from(await certBlob.arrayBuffer());
    const keys = extractKeysFromP12(certBuffer, siatSettings.siat_cert_password);

    // 3. Normalizar fecha a Hora Bolivia (UTC-4)
    const d = new Date(facturaParams.cabecera.fechaEmision || Date.now());
    d.setUTCHours(d.getUTCHours() - 4);
    const siatDate = d.toISOString().replace('Z', '');

    const sucursal = siatSettings.siat_codigo_sucursal || 0;
    const puntoVenta = siatSettings.siat_codigo_punto_venta || 0;

    // 4. Parámetros y generación de CUF
    const cufParams = {
      nit: siatSettings.siat_nit,
      fechaEmision: siatDate,
      sucursal,
      modalidad: 1,
      tipoEmision: 1, // Online
      tipoFactura: 1,
      tipoDocumentoSector: 1,
      numeroFactura: facturaParams.cabecera.numeroFactura,
      puntoVenta,
      codigoControlCufd: siatSettings.siat_codigo_control_cufd || siatSettings.siat_cufd.slice(-16)
    };

    const cuf = generarCUF(cufParams);

    // Inyectar cabeceras requeridas
    facturaParams.cabecera.cuf = cuf;
    facturaParams.cabecera.cufd = siatSettings.siat_cufd;
    facturaParams.cabecera.fechaEmision = siatDate;
    facturaParams.cabecera.nitEmisor = siatSettings.siat_nit;
    facturaParams.cabecera.codigoSucursal = sucursal;
    facturaParams.cabecera.codigoPuntoVenta = puntoVenta;

    // Manejo de cliente sin NIT/CI
    if (!facturaParams.cabecera.numeroDocumento || facturaParams.cabecera.numeroDocumento === '0') {
      facturaParams.cabecera.numeroDocumento = '99002'; // Control Tributario
      facturaParams.cabecera.nombreRazonSocial = 'CONTROL TRIBUTARIO';
      facturaParams.cabecera.codigoTipoDocumentoIdentidad = 1;
    }

    // 5. Construir y Firmar XML
    const xmlBase = buildFacturaXml(facturaParams);
    const xmlFirmado = signXml(xmlBase, keys.privateKeyPem, keys.certPem);

    let isSuccess = false;
    let isOffline = false;
    let resp: any = null;
    let xmlFinal = xmlFirmado;
    let cufFinal = cuf;

    try {
      // 6. Enviar al SIN
      const respuestaSiat = await emitirFacturaSIAT(xmlFirmado, siatSettings);
      resp = respuestaSiat.RespuestaServicioFacturacion;
      isSuccess = resp && (resp.codigoEstado === 904 || resp.codigoEstado === 908);
    } catch (networkError) {
      // Si el SIAT se cae, fallback automático a modo Offline (Contingencia)
      isOffline = true;
      cufParams.tipoEmision = 2; // Offline
      cufFinal = generarCUF(cufParams);
      facturaParams.cabecera.cuf = cufFinal;
      if (siatSettings.siat_cafc) facturaParams.cabecera.cafc = siatSettings.siat_cafc;

      const xmlOffline = buildFacturaXml(facturaParams);
      xmlFinal = signXml(xmlOffline, keys.privateKeyPem, keys.certPem);
    }

    const estado = isOffline ? 'PENDIENTE_OFFLINE' : (isSuccess ? 'VALIDADA' : 'RECHAZADA');

    // 7. Guardar en Base de Datos
    await supabaseAdmin.from('invoices').insert({
      order_id: orderId,
      restaurant_id: restaurantId,
      cuf: cufFinal,
      numero_factura: facturaParams.cabecera.numeroFactura,
      xml_signed: xmlFinal,
      siat_estado: estado,
      codigo_recepcion: resp?.codigoRecepcion || null,
      detalles_error: !isSuccess && !isOffline ? JSON.stringify(resp?.mensajesList || resp) : null
    });

    return NextResponse.json({
      success: isSuccess || isOffline,
      offline: isOffline,
      cuf: cufFinal,
      codigoRecepcion: resp?.codigoRecepcion
    });

  } catch (error: any) {
    console.error("Error en emisión:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 11. Ruta de Anulación API (`POST /api/siat/anular`)

Crea `src/app/api/siat/anular/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as soap from "soap";
import { siatConfig } from "@/lib/siat/config";

export async function POST(req: Request) {
  try {
    const { restaurantId, cuf, codigoMotivoAnulacion } = await req.json();

    const { data: siatSettings } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    const client = await soap.createClientAsync(siatConfig.wsdlCompraVenta);
    client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);

    const [result] = await client.anulacionFacturaAsync({
      SolicitudServicioAnulacionFactura: {
        codigoAmbiente: siatConfig.ambiente,
        codigoDocumentoSector: 1,
        codigoEmision: 1,
        codigoModalidad: 1,
        codigoPuntoVenta: siatSettings.siat_codigo_punto_venta || 0,
        codigoSistema: siatConfig.codigoSistema,
        codigoSucursal: siatSettings.siat_codigo_sucursal || 0,
        cufd: siatSettings.siat_cufd,
        cuis: siatSettings.siat_cuis,
        nit: parseInt(siatSettings.siat_nit, 10),
        tipoFacturaDocumento: 1,
        cuf: cuf,
        codigoMotivo: codigoMotivoAnulacion || 1 // 1 = FACTURA MAL EMITIDA
      }
    });

    const resp = result.RespuestaServicioFacturacion;
    if (resp && resp.transaccion) {
      await supabaseAdmin.from('invoices').update({
        siat_estado: 'ANULADA',
        detalles_error: 'Factura anulada con éxito'
      }).eq('cuf', cuf);

      return NextResponse.json({ success: true, message: "Factura anulada exitosamente" });
    } else {
      return NextResponse.json({ success: false, error: "Rechazo del SIAT", detalles: resp?.mensajesList }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 12. Representación Gráfica (Ticket / PDF) y Código QR Oficial

### Estructura de la URL del QR Tributario:
El SIN exige un código QR impreso en la factura con la siguiente estructura:

```
https://siat.impuestos.gob.bo/consulta/QR?nit={nit}&cuf={cuf}&numero={numeroFactura}&t=2
```

Donde:
- `nit`: NIT del emisor.
- `cuf`: Código Único de Factura.
- `numero`: Número correlativo de la factura.
- `t`: Tipo de documento (2 = Factura electrónica en línea).

### Textos Legales Obligatorios en el Pie de Factura:
1. **Leyenda Fija del SIN:**  
   `"Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido en una modalidad de facturación en línea"`
2. **Leyenda de Protección al Consumidor:**  
   `"Ley N° 453: Tienes derecho a recibir un trato equitativo y justo en el pago de tus compras."`

---

## 13. Manejo de Contingencias y Modo Offline

Cuando el SIAT no responde por caída de servidores o corte de internet local:

1. **Emisión Offline Inmediata:**  
   No se detiene la atención al cliente. Se genera el CUF con `tipoEmision = 2 (Offline)`. Si el contribuyente cuenta con CAFC (Código de Autorización de Facturas por Contingencia), se incluye en el XML.
2. **Estado en Base de Datos:**  
   Se almacena con estado `PENDIENTE_OFFLINE`.
3. **Empaquetado y Envío en Lote:**  
   La normativa otorga **hasta 48 horas** para enviar las facturas offline agrupadas en paquetes `.tar.gz` o validadas individualmente una vez restablecida la conexión.

---

## 14. Checklist de Puesta en Marcha (Paso a Paso)

Para activar la facturación en un nuevo proyecto:

- [ ] **Paso 1:** Instalar librerías (`npm i soap node-forge xml-crypto @xmldom/xmldom qrcode.react`).
- [ ] **Paso 2:** Configurar `.env` con `SIAT_CODIGO_SISTEMA`, `SIAT_TOKEN_DELEGADO` y `SIAT_AMBIENTE=2` (Piloto).
- [ ] **Paso 3:** Ejecutar el script SQL para crear las tablas `restaurant_siat_settings`, `invoices` y el bucket de Storage `siat_certificates`.
- [ ] **Paso 4:** Copiar la carpeta `src/lib/siat/` a tu proyecto.
- [ ] **Paso 5:** Subir el certificado `.p12` de prueba y guardar la contraseña en `restaurant_siat_settings`.
- [ ] **Paso 6:** Ejecutar `solicitarCUIS` para obtener el CUIS inicial.
- [ ] **Paso 7:** Ejecutar `sincronizarCatalogosSIAT` para guardar la actividad económica y código de producto SIN válidos.
- [ ] **Paso 8:** Ejecutar `solicitarCUFD` para obtener el CUFD del día y su código de control.
- [ ] **Paso 9:** Emitir una factura de prueba y verificar que retorne estado `908 (VALIDADA)`.
- [ ] **Paso 10:** Escanear el código QR impreso con la app oficial de Impuestos Nacionales para verificar su validez.

---

## 15. Errores Comunes del SIAT y Soluciones

| Código / Error | Causa | Solución |
| :--- | :--- | :--- |
| **Error 902 / Rechazada** | El CUF no coincide con los datos del XML | La fecha de emisión en el CUF debe ser **idéntica al milisegundo** a la fecha dentro del tag `<fechaEmision>` del XML. Asegurar timezone UTC-4. |
| **Error 1017** | Actividad económica no homologada con el producto | Usar siempre el `codigoActividad` que retorna el método `sincronizarListaProductosServiciosAsync`. |
| **Error de Firma Digital** | Certificado expirado, contraseña errónea o digest inválido | Comprobar contraseña del `.p12`. Verificar que el algoritmo sea `rsa-sha256` y enveloped signature. |
| **Error CUFD Vencido** | El CUFD tiene más de 24 horas | Configurar un cronjob diario (ej: 04:00 AM) para renovar automáticamente el CUFD. |
| **NIT No Encontrado** | Cliente proporciona un NIT nuevo o no registrado en padrón | Marcar `codigoExcepcion: 1` en la cabecera del XML para permitir la emisión. |
| **Cliente sin Documento** | Consumidor final sin NIT ni CI | Usar `numeroDocumento: '99002'` y `nombreRazonSocial: 'CONTROL TRIBUTARIO'`. |

