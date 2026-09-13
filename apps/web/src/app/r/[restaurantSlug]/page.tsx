import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import ReservationFlow from "./ReservationFlow";

export default async function PublicReservationPage({ params }: { params: { restaurantSlug: string } }) {
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, slug, reservation_settings')
    .eq('slug', params.restaurantSlug)
    .single();

  if (!restaurant) {
    notFound();
  }

  // Get the first active branch for reservations
  const { data: branch } = await supabaseAdmin
    .from('branches')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-[#E76F51] selection:text-white">
      <div className="max-w-2xl mx-auto p-4 md:p-8 pt-12">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{restaurant.name}</h1>
          <p className="text-[#888888]">Reserva tu mesa con nosotros</p>
        </header>
        
        <ReservationFlow restaurant={restaurant} branchId={branch?.id} />
      </div>
    </div>
  );
}

