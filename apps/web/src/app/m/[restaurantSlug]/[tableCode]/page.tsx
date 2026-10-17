import { supabaseAdmin } from '@/lib/supabase-admin';
import PublicMenuClient from './PublicMenuClient';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ restaurantSlug: string, tableCode: string }> }): Promise<Metadata> {
  const { restaurantSlug: rawSlug } = await params;
  const restaurantSlug = decodeURIComponent(rawSlug);

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('name, logo_url')
    .eq('slug', restaurantSlug)
    .single();

  if (restaurant) {
    const description = `Menú digital de ${restaurant.name} | Realiza tu pedido desde la mesa.`;
    return {
      title: `Menú | ${restaurant.name}`,
      description,
      openGraph: {
        title: `Menú | ${restaurant.name}`,
        description,
        images: restaurant.logo_url ? [restaurant.logo_url] : [],
      },
      icons: restaurant.logo_url
        ? {
            icon: [
              { url: restaurant.logo_url },
              { url: restaurant.logo_url, sizes: '32x32' },
              { url: restaurant.logo_url, sizes: '192x192' },
            ],
            shortcut: [restaurant.logo_url],
            apple: [
              { url: restaurant.logo_url },
              { url: restaurant.logo_url, sizes: '180x180' },
            ],
          }
        : undefined,
    };
  }
  
  return {
    title: 'Menú Digital | Servido'
  };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ restaurantSlug: string, tableCode: string }> }) {
  const { restaurantSlug: rawSlug, tableCode: rawTableCode } = await params;
  const restaurantSlug = decodeURIComponent(rawSlug);
  const tableCode = decodeURIComponent(rawTableCode);

  // 1. Fetch restaurant by slug
  const { data: restaurantData, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single();

  if (restaurantError || !restaurantData) {
    return <div>Error: Restaurante no encontrado</div>;
  }

  const restaurant = restaurantData;

  // 2. Fetch table info scoped to this restaurant
  let { data: tableData, error: tableError } = await supabaseAdmin
    .from('tables')
    .select('*')
    .eq('table_code', tableCode)
    .eq('restaurant_id', restaurant.id)
    .limit(1)
    .maybeSingle();

  // Fallback para compatibilidad entre MESA- y BARRA-
  if (!tableData && !tableError) {
    let alternateCode = '';
    if (tableCode.startsWith('MESA-')) {
      alternateCode = tableCode.replace('MESA-', 'BARRA-');
    } else if (tableCode.startsWith('BARRA-')) {
      alternateCode = tableCode.replace('BARRA-', 'MESA-');
    }

    if (alternateCode) {
      const { data: altTableData, error: altError } = await supabaseAdmin
        .from('tables')
        .select('*')
        .eq('table_code', alternateCode)
        .eq('restaurant_id', restaurant.id)
        .limit(1)
        .maybeSingle();

      if (!altError && altTableData) {
        tableData = altTableData;
      }
    }
  }

  if (tableError) {
    return <div>Error al cargar la mesa: {tableError.message}</div>;
  }
  
  if (!tableData) {
    return <div>Esta mesa o barra no existe o fue eliminada. Por favor escanea un código QR válido.</div>;
  }

  const branchId = tableData.branch_id;
  let branchData = null;
  if (branchId) {
    const { data: b } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .maybeSingle();
    branchData = b;
  }

  // 2. Fetch categories
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // 3. Fetch products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // 4. Fetch subsections
  const categoryIds = categories?.map(c => c.id) || [];
  let subsections: any[] = [];
  if (categoryIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('subsections')
      .select('*')
      .in('category_id', categoryIds)
      .order('sort_order', { ascending: true });
    subsections = data || [];
  }

  return (
    <PublicMenuClient 
      table={tableData as any}
      restaurant={restaurant as any}
      branch={branchData as any}
      categories={categories as any[]}
      products={products as any[]}
      subsections={subsections as any[]}
    />
  );
}
