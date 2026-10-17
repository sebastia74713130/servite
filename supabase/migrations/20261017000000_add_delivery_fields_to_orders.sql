-- Migration: Add delivery and fulfillment details to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_location_url TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS delivery_extra_minutes INTEGER DEFAULT 10;

-- Ensure branches table has google_maps_url
ALTER TABLE public.branches 
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

