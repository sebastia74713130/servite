-- Añadir campos para diseño global del menú
ALTER TABLE public.restaurants 
ADD COLUMN menu_background_color TEXT,
ADD COLUMN menu_background_image_url TEXT,
ADD COLUMN menu_text_color TEXT;
