-- Añadir soporte para API Key y URL del microservicio de facturación centralizado
ALTER TABLE public.restaurant_siat_settings
ADD COLUMN IF NOT EXISTS siat_api_key TEXT,
ADD COLUMN IF NOT EXISTS siat_api_url TEXT DEFAULT 'https://facturas-by-tendai-nhnm.vercel.app';

