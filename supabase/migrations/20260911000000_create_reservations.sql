-- Reservations table for managing table reservation requests
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    party_size INTEGER NOT NULL DEFAULT 2,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can create a reservation (public form)
CREATE POLICY "Anyone can create a reservation" ON public.reservations FOR INSERT WITH CHECK (true);
-- Anyone can view reservations (for public status check)
CREATE POLICY "Anyone can view reservations" ON public.reservations FOR SELECT USING (true);
-- Authenticated users have full access (restaurant admins)
CREATE POLICY "Authenticated users have full access to reservations" ON public.reservations FOR ALL USING (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
