import { supabase } from '@/lib/supabase';
import PublicMenuClient from './PublicMenuClient';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function PublicMenuPage({ params }: { params: Promise<{ restaurantSlug: string, tableCode: string }> }) {
  const { restaurantSlug: rawSlug, tableCode: rawTableCode } = await params;
  const restaurantSlug = decodeURIComponent(rawSlug);
  const tableCode = decodeURIComponent(rawTableCode);

  // 1. Fetch restaurant by slug
  const { data: restaurantData, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single();

  if (restaurantError || !restaurantData) {
    return <div>Error: Restaurante no encontrado</div>;
  }

  const restaurant = restaurantData;

  // 2. Fetch table info scoped to this restaurant
  const { data: tableData, error: tableError } = await supabase
    .from('tables')
    .select('*')
    .eq('table_code', tableCode)
    .eq('restaurant_id', restaurant.id)
    .limit(1)
    .maybeSingle();

  if (tableError) {
    return <div>Error al cargar la mesa: {tableError.message}</div>;
  }
  
  if (!tableData) {
    return <div>Esta mesa no existe o fue eliminada. Por favor escanea un código QR válido.</div>;
  }

  const branchId = tableData.branch_id;

  // 2. Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // 3. Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // 4. Fetch subsections
  const categoryIds = categories?.map(c => c.id) || [];
  let subsections: any[] = [];
  if (categoryIds.length > 0) {
    const { data } = await supabase
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
      categories={categories as any[]}
      products={products as any[]}
      subsections={subsections as any[]}
    />
  );
}
