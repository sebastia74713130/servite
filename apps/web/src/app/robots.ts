import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/r/', '/login', '/register'],
      disallow: [
        '/m/', // Table specific QR menus shouldn't really be indexed
        '/inventory/',
        '/settings/',
        '/finances/',
        '/menu/',
        '/orders/',
        '/kitchen/',
        '/invoices/',
        '/accounts/',
        '/branches/',
        '/tables/',
        '/reservations/',
        '/api/',
      ],
    },
    // We would put the sitemap URL here if we had a domain, 
    // sitemap: 'https://servido.com.bo/sitemap.xml',
  };
}
