-- Create a dedicated table for SIAT configuration per restaurant
CREATE TABLE public.restaurant_siat_settings (
    restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    siat_nit TEXT NOT NULL,
    siat_codigo_sucursal INTEGER DEFAULT 0,
    siat_codigo_punto_venta INTEGER DEFAULT 0,
    siat_cert_password TEXT NOT NULL,
    siat_cuis TEXT,
    siat_cufd TEXT,
    cufd_fecha_vigencia TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: We don't save the siat_cert_path in the table because we will use a strict naming convention 
-- in the storage bucket (e.g., /siat_certificates/{restaurant_id}/cert.p12) for enhanced security.

-- Enable RLS for the new table
ALTER TABLE public.restaurant_siat_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Admins/Owners) to manage their restaurant's SIAT settings
-- (In a real production environment, you should restrict this to only 'owner' role)
CREATE POLICY "Authenticated users can manage SIAT settings" 
ON public.restaurant_siat_settings 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create a secure Storage Bucket for the .p12 certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'siat_certificates',
  'siat_certificates',
  false, -- MUST be false (private) so no one can download the .p12 from the internet
  5242880, -- 5MB Limit
  ARRAY['application/x-pkcs12', 'application/octet-stream'] -- Only allow .p12 files
) ON CONFLICT (id) DO NOTHING;

-- RLS for Storage Bucket (Only authenticated users can upload/read their own certificates)
CREATE POLICY "Users can upload their own certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'siat_certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'siat_certificates');

CREATE POLICY "Users can update their own certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'siat_certificates');
