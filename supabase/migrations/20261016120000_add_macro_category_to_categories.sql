-- Migration: Add macro_category column to categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS macro_category TEXT DEFAULT 'food';

