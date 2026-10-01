ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS siat_codigo_sucursal TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS siat_codigo_punto_venta TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS siat_cuis TEXT,
ADD COLUMN IF NOT EXISTS siat_cufd TEXT,
ADD COLUMN IF NOT EXISTS siat_codigo_control_cufd TEXT,
ADD COLUMN IF NOT EXISTS cufd_fecha_vigencia TEXT;
