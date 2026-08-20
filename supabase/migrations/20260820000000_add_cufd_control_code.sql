-- Add missing control code column for CUF generation
ALTER TABLE public.restaurant_siat_settings 
ADD COLUMN IF NOT EXISTS siat_codigo_control_cufd TEXT;

-- Add synchronization columns for Activities and Products
ALTER TABLE public.restaurant_siat_settings 
ADD COLUMN IF NOT EXISTS siat_actividad_economica TEXT,
ADD COLUMN IF NOT EXISTS siat_codigo_producto_sin INTEGER;
