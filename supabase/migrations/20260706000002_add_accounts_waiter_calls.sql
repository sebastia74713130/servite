-- Add service status to tables
ALTER TABLE public.tables ADD COLUMN service_status TEXT;

-- Add is_paid to orders
ALTER TABLE public.orders ADD COLUMN is_paid BOOLEAN DEFAULT false;
