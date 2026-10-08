import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import ReservationFlow from "./ReservationFlow";
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ restaurantSlug: string }> }): Promise<Metadata> {
  const { restaurantSlug } = await params;

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('name, logo_url')
    .eq('slug', restaurantSlug)
    .single();

  if (restaurant) {
    const description = `Conoce el menú y reserva tu mesa en ${restaurant.name} a través de Servido.`;
    return {
      title: `${restaurant.name} | Menú y Reservas`,
      description,
      openGraph: {
        title: `${restaurant.name} | Menú y Reservas`,
        description,
        images: restaurant.logo_url ? [restaurant.logo_url] : [],
      },
      icons: restaurant.logo_url ? [{ rel: 'icon', url: restaurant.logo_url }] : undefined,
    };
  }
  
  return {
    title: 'Restaurante no encontrado | Servido'
  };
}

export default async function PublicReservationPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const { restaurantSlug } = await params;

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, slug, reservation_settings, logo_url, brand_color')
    .eq('slug', restaurantSlug)
    .single();

  if (!restaurant) {
    notFound();
  }

  // Get the first active branch for reservations
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, name')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true);

  const brandColor = restaurant.brand_color || '#E76F51';

  return (
    <div 
      className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden"
      style={{
        '--brand-color': brandColor,
      } as React.CSSProperties}
    >
      {/* Background ambient light */}
      <div 
        className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[120%] h-[50vh] rounded-[100%] blur-[120px] opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top, ${brandColor}, transparent 70%)` }}
      />
      
      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-8 pt-12 md:pt-16">
        <header className="mb-10 text-center flex flex-col items-center">
          {restaurant.logo_url ? (
            <div className="w-24 h-24 mb-6 rounded-full overflow-hidden border-4 border-[#1A1A1A] shadow-2xl shadow-black/50 bg-white flex items-center justify-center animate-in fade-in zoom-in duration-500">
              <img src={restaurant.logo_url} alt={`Logo ${restaurant.name}`} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div 
              className="w-24 h-24 mb-6 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-[#1A1A1A] shadow-2xl shadow-black/50 animate-in fade-in zoom-in duration-500"
              style={{ backgroundColor: brandColor, color: '#fff' }}
            >
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">{restaurant.name}</h1>
          <p className="text-[#A0A0A0] text-lg font-medium animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">Reserva tu mesa con nosotros</p>
        </header>
        
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 delay-300">
          <ReservationFlow restaurant={{...restaurant, brandColor}} branches={branches || []} />
        </div>
      </div>
    </div>
  );
}

