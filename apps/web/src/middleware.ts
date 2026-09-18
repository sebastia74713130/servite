import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware para detectar subdominios de restaurantes y reescribir la URL
 * internamente a la ruta /m/[restaurantSlug]/[...path].
 * 
 * Ejemplo:
 *   Petición: https://mi-restaurante.servido.app/MESA-1
 *   Reescribe a: /m/mi-restaurante/MESA-1
 * 
 * Requiere que NEXT_PUBLIC_ROOT_DOMAIN esté configurado (ej: "servido.app").
 * Si no está configurado, el middleware no hace nada.
 */
export function middleware(request: NextRequest) {
  let rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  const hostname = request.headers.get('host') || '';
  const hostnameWithoutPort = hostname.split(':')[0];

  // Si no hay dominio raíz configurado, intentamos deducirlo (ej. servite.com)
  if (!rootDomain) {
    if (hostnameWithoutPort === 'localhost' || hostnameWithoutPort.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return NextResponse.next();
    }
    const parts = hostnameWithoutPort.split('.');
    if (parts.length >= 2) {
      rootDomain = parts.slice(-2).join('.');
    }
  }

  if (!rootDomain) {
    return NextResponse.next();
  }
  
  // Remover el puerto si existe (para desarrollo local)
  // (ya fue declarado arriba)

  // Si es el dominio raíz o www, dejar pasar normalmente (dashboard)
  if (
    hostnameWithoutPort === rootDomain ||
    hostnameWithoutPort === `www.${rootDomain}` ||
    hostnameWithoutPort === 'localhost'
  ) {
    return NextResponse.next();
  }

  // Extraer el subdominio
  // Ej: "mi-restaurante.servido.app" → "mi-restaurante"
  const subdomain = hostnameWithoutPort.replace(`.${rootDomain}`, '');

  // Si no hay subdominio o es el mismo hostname (no se extrajo nada), dejar pasar
  if (!subdomain || subdomain === hostnameWithoutPort) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // No reescribir rutas del sistema
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/m/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')
  ) {
    return NextResponse.next();
  }

  // Reescribir rutas de menús y reservas
  const rewrittenUrl = request.nextUrl.clone();
  
  if (pathname === '/reservas' || pathname === '/r') {
    rewrittenUrl.pathname = `/r/${subdomain}`;
  } else {
    // Si no es reservas, asumimos que es el código de mesa (ej: /MESA-1 -> /m/mi-restaurante/MESA-1)
    rewrittenUrl.pathname = `/m/${subdomain}${pathname}`;
  }
  
  return NextResponse.rewrite(rewrittenUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (browser icon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
