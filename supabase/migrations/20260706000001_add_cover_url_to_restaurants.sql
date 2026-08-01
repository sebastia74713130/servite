-- Añadir campo para foto de portada al restaurante
ALTER TABLE public.restaurants 
ADD COLUMN cover_url TEXT;
