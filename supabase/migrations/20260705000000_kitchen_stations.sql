-- Migration: Kitchen Stations

-- 1. Create kitchen_stations table
CREATE TABLE public.kitchen_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add station_id to products
ALTER TABLE public.products 
ADD COLUMN station_id UUID REFERENCES public.kitchen_stations(id) ON DELETE SET NULL;

-- 3. Add station_id to order_items
ALTER TABLE public.order_items 
ADD COLUMN station_id UUID REFERENCES public.kitchen_stations(id) ON DELETE SET NULL;

-- 4. Enable RLS
ALTER TABLE public.kitchen_stations ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public can view active kitchen stations" 
ON public.kitchen_stations FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users have full access to kitchen stations" 
ON public.kitchen_stations FOR ALL 
USING (auth.role() = 'authenticated');
