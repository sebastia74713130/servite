-- Add subscription fields to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'BASIC',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
