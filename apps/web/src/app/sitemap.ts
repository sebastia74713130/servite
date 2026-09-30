import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://servido.com.bo'; // Replace with actual production URL

  // Fetch all active restaurants for public menus
  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('slug, created_at');

  const restaurantUrls: MetadataRoute.Sitemap = (restaurants || []).map((restaurant) => ({
    url: `${baseUrl}/r/${restaurant.slug}`,
    lastModified: new Date(restaurant.created_at || new Date()),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    ...restaurantUrls,
  ];
}
