-- Migration: Add estimated prep time to orders table
-- estimated_prep_minutes: Preparation time in minutes assigned by kitchen (e.g. 15, 20, 25)
-- estimated_ready_at: Timestamp when order is estimated to be ready for pickup / delivery

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS estimated_prep_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMP WITH TIME ZONE;

