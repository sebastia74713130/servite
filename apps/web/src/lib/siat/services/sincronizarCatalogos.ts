import * as soap from "soap";
import { siatConfig } from "../config";

export async function sincronizarCatalogosSIAT(params: {
  codigoAmbiente: number;
  codigoPuntoVenta: number;
  codigoSistema: string;
  codigoSucursal: number;
  cuis: string;
  nit: number;
}) {
  try {
    const client = await soap.createClientAsync(siatConfig.wsdlSincronizacionPiloto);
    client.addHttpHeader("apikey", `TokenApi ${siatConfig.tokenDelegado}`);

    const args = {
      SolicitudSincronizacion: {
        codigoAmbiente: params.codigoAmbiente,
        codigoPuntoVenta: params.codigoPuntoVenta,
        codigoSistema: params.codigoSistema,
        codigoSucursal: params.codigoSucursal,
        cuis: params.cuis,
        nit: params.nit
      }
    };

    // 1. Sincronizar Actividades
    const [actividadesResult] = await client.sincronizarActividadesAsync(args);
    const listaActividades = actividadesResult.RespuestaListaActividades?.listaActividades;
    
    let codigoActividad = null;
    if (Array.isArray(listaActividades) && listaActividades.length > 0) {
      codigoActividad = listaActividades[0].codigoCaeb;
    } else if (listaActividades?.codigoCaeb) {
      codigoActividad = listaActividades.codigoCaeb;
    }

    if (!codigoActividad) {
      throw new Error("No se pudo obtener el código de actividad del SIAT. " + JSON.stringify(actividadesResult));
    }

    // 2. Sincronizar Productos
    const [productosResult] = await client.sincronizarListaProductosServiciosAsync(args);
    const listaProductos = productosResult.RespuestaListaProductos?.listaProductos;

    let codigoProducto = null;
    if (Array.isArray(listaProductos) && listaProductos.length > 0) {
      codigoProducto = listaProductos[0].codigoProducto;
    } else if (listaProductos?.codigoProducto) {
      codigoProducto = listaProductos.codigoProducto;
    }

    if (!codigoProducto) {
      throw new Error("No se pudo obtener la lista de productos del SIAT.");
    }

    return {
      actividad: codigoActividad,
      producto: codigoProducto
    };

  } catch (error: any) {
    console.error("Error en sincronizarCatalogosSIAT:", error);
    throw new Error(error.message || "Fallo en la comunicación con SIAT (Sincronización)");
  }
}
