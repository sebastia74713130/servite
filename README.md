# Servido MVP

Este es el monorepo del MVP para Servido. 
Incluye:
- **apps/web**: Panel para restaurantes (Next.js).
- **apps/mobile**: App para clientes (React Native con Expo).

## Iniciar el proyecto

### 1. Panel de Restaurante (Web)
Desde la raíz del proyecto, abre una terminal y ejecuta:
```bash
cd apps/web
npm run dev
```
Luego abre [http://localhost:3000](http://localhost:3000) en tu navegador. 
- Para ver las mesas y generar QR: ve a `/tables`
- Para ver la pantalla de cocina (Realtime): ve a `/kitchen`

### 2. App Móvil de Clientes
En una nueva terminal, ejecuta:
```bash
cd apps/mobile
npm start
```
Esto abrirá Metro Bundler. Puedes presionar `w` para abrir en web, o escanear el QR con la app **Expo Go** en tu celular para ver la app nativa en vivo.

### Flujo de Prueba
1. Abre `/tables` en la Web y mira el QR de la Mesa 2.
2. Abre la App Móvil y simula el escaneo (o escanea el QR en la pantalla).
3. Agrega productos al carrito en la app y añade una nota.
4. Presiona "Enviar pedido a cocina".
5. Verás inmediatamente aparecer el pedido en `/kitchen` (Panel Web).
6. Cambia el estado del pedido a "Preparar" y "Marcar Listo" en la cocina.
7. Observa cómo la pantalla de estado en la App Móvil cambia al instante (Realtime).
