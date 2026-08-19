-- Migration: Add customer data fields and food court session support to orders
-- customer_name: Name of the customer (for calling them at the bar)
-- customer_nit: Tax ID for invoicing (optional)
-- food_court_session_id: Shared session ID across multiple restaurants in a food court

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_nit TEXT,
  ADD COLUMN IF NOT EXISTS food_court_session_id TEXT;

-- Index for fast food court session lookups
CREATE INDEX IF NOT EXISTS orders_food_court_session_idx 
  ON public.orders(food_court_session_id);

-- Allow anyone to read orders by food_court_session_id (for multi-restaurant bill view)
CREATE POLICY IF NOT EXISTS "Anyone can view orders by food court session"
  ON public.orders FOR SELECT
  USING (food_court_session_id IS NOT NULL);
