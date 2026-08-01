-- Add new customization columns to categories
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS page_background_color TEXT,
  ADD COLUMN IF NOT EXISTS page_text_color TEXT;

-- Create subsections table
CREATE TABLE IF NOT EXISTS public.subsections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    background_color TEXT,
    text_color TEXT,
    image_url TEXT,
    typography TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for subsections
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subsections are viewable by everyone." 
ON public.subsections FOR SELECT 
USING (true);

CREATE POLICY "Subsections are insertable by authenticated users." 
ON public.subsections FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Subsections are updatable by authenticated users." 
ON public.subsections FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Subsections are deletable by authenticated users." 
ON public.subsections FOR DELETE 
USING (auth.role() = 'authenticated');

-- Add new customization columns to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS card_background_color TEXT,
  ADD COLUMN IF NOT EXISTS card_text_color TEXT,
  ADD COLUMN IF NOT EXISTS subsection_id UUID REFERENCES public.subsections(id) ON DELETE SET NULL;
