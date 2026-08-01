-- Migration: Add branding fields to restaurants and categories

-- 1. Add brand_color to restaurants (logo_url already exists)
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#F9FAFB';

-- 2. Add branding fields to categories
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS background_color TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Create branding storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies for "branding" bucket
-- Policy: Allow public read access
CREATE POLICY "Public Access branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

-- Policy: Allow authenticated users to update
CREATE POLICY "Authenticated users can update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

-- Policy: Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding');
