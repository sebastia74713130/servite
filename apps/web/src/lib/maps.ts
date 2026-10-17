/**
 * Utility functions for validating Google Maps links and resolving restaurant locations.
 */

export interface MapsValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  error?: string;
}

/**
 * Validates whether a string is a recognized, valid Google Maps URL.
 * Accepts mobile app links (maps.app.goo.gl), shortlinks (goo.gl/maps),
 * and standard web links (google.com/maps, maps.google.com).
 */
export function validateGoogleMapsUrl(input: string): MapsValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalizedUrl: '',
      error: 'Debes ingresar un enlace de Google Maps con tu ubicación.'
    };
  }

  const trimmed = input.trim();
  if (trimmed.length < 5) {
    return {
      isValid: false,
      normalizedUrl: '',
      error: 'El enlace ingresado es demasiado corto.'
    };
  }

  // Prepend protocol if user pasted e.g. "maps.app.goo.gl/..."
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.toLowerCase();

    // Check valid Google Maps domains
    const isMapsAppShortLink = hostname === 'maps.app.goo.gl';
    const isGooGlMaps = (hostname === 'goo.gl' || hostname === 'www.goo.gl') && parsed.pathname.startsWith('/maps');
    const isGoogleMapsDomain = (hostname === 'maps.google.com' || hostname.endsWith('.maps.google.com'));
    const isGoogleDomainWithMapsPath = (
      hostname === 'google.com' ||
      hostname.endsWith('.google.com') ||
      hostname === 'google.com.bo' ||
      hostname.endsWith('.google.com.bo')
    ) && (parsed.pathname.startsWith('/maps') || parsed.pathname.startsWith('/search'));

    if (isMapsAppShortLink || isGooGlMaps || isGoogleMapsDomain || isGoogleDomainWithMapsPath) {
      return {
        isValid: true,
        normalizedUrl: parsed.toString()
      };
    }

    return {
      isValid: false,
      normalizedUrl: '',
      error: 'El enlace no corresponde a Google Maps (debe ser maps.app.goo.gl o google.com/maps).'
    };
  } catch {
    return {
      isValid: false,
      normalizedUrl: '',
      error: 'Formato de enlace inválido. Copia el enlace desde Google Maps.'
    };
  }
}

/**
 * Resolves the Google Maps URL for a restaurant and branch.
 * Falls back to a search query URL if no custom link is set.
 */
export function getRestaurantMapsUrl(restaurant?: any, branch?: any): string {
  if (branch?.google_maps_url && branch.google_maps_url.trim()) {
    return branch.google_maps_url.trim();
  }

  if (restaurant?.google_maps_url && restaurant.google_maps_url.trim()) {
    return restaurant.google_maps_url.trim();
  }

  // Fallback to Google Maps Search query with name and address/city
  const parts = [
    restaurant?.name || '',
    branch?.address || restaurant?.address || '',
    branch?.city || restaurant?.city || ''
  ].filter(Boolean);

  const query = encodeURIComponent(parts.join(', ').trim() || 'Restaurante');
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

