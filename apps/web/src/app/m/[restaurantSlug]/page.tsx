import { supabaseAdmin } from "@/lib/supabase-admin";
import PublicCatalogMenuClient from "./PublicCatalogMenuClient";
import { Metadata } from "next";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export async function generateMetadata({
  params
}: {
  params: Promise<{ restaurantSlug: string }>;
}): Promise<Metadata> {
  const { restaurantSlug: rawSlug } = await params;
  const restaurantSlug = decodeURIComponent(rawSlug);

  const { data: restaurant } = await supabaseAdmin
    .from("restaurants")
    .select("name, logo_url, cover_url, description")
    .eq("slug", restaurantSlug)
    .single();

  if (restaurant) {
    const description = restaurant.description || `Explora el menú digital y la carta de ${restaurant.name}.`;
    return {
      title: `Menú Digital | ${restaurant.name}`,
      description,
      openGraph: {
        title: `Menú Digital | ${restaurant.name}`,
        description,
        images: restaurant.logo_url ? [restaurant.logo_url] : restaurant.cover_url ? [restaurant.cover_url] : [],
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
    title: "Menú Digital | Servido"
  };
}

export default async function PublicCatalogMenuPage({
  params
}: {
  params: Promise<{ restaurantSlug: string }>;
}) {
  const { restaurantSlug: rawSlug } = await params;
  const restaurantSlug = decodeURIComponent(rawSlug);

  // 1. Obtener restaurante por slug
  const { data: restaurant, error: restError } = await supabaseAdmin
    .from("restaurants")
    .select("*")
    .eq("slug", restaurantSlug)
    .single();

  if (restError || !restaurant) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Restaurante no encontrado</h1>
          <p className="text-sm text-slate-500 mb-6">
            No se encontró ningún restaurante registrado con el identificador <span className="font-mono font-semibold text-slate-700">/{restaurantSlug}</span>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1F2933] text-white rounded-xl text-sm font-bold hover:bg-[#323F4B] transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Obtener sucursal principal
  const { data: branch } = await supabaseAdmin
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 3. Obtener categorías activas
  let catQuery = supabaseAdmin
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (branch?.id) {
    catQuery = catQuery.eq("branch_id", branch.id);
  }

  const { data: categoriesData } = await catQuery;
  const categories = categoriesData || [];

  // 4. Obtener productos activos
  let prodQuery = supabaseAdmin
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (branch?.id) {
    prodQuery = prodQuery.eq("branch_id", branch.id);
  }

  const { data: productsData } = await prodQuery;
  const products = productsData || [];

  // 5. Obtener subsecciones si hay categorías
  let subsections: any[] = [];
  if (categories.length > 0) {
    const catIds = categories.map((c) => c.id);
    const { data: subData } = await supabaseAdmin
      .from("subsections")
      .select("*")
      .in("category_id", catIds)
      .order("sort_order", { ascending: true });
    subsections = subData || [];
  }

  return (
    <PublicCatalogMenuClient
      restaurant={restaurant}
      branch={branch}
      categories={categories}
      products={products}
      subsections={subsections}
    />
  );
}

