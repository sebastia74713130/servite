-- Migration: Platform Admin and Modular Subscriptions
-- Description: Adds enabled_modules, subscription_notes, monthly_price to restaurants, creates platform_admins table and backfills existing restaurants.

-- 1. Extend restaurants table with modular subscription fields
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT ARRAY['menu', 'tables', 'takeaway', 'orders', 'kitchen', 'accounts', 'invoices', 'inventory', 'finances', 'reservations', 'branches']::TEXT[],
ADD COLUMN IF NOT EXISTS subscription_notes TEXT,
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

-- 2. Backfill existing restaurants with all current modules to prevent any operational disruption
UPDATE public.restaurants 
SET enabled_modules = ARRAY['menu', 'tables', 'takeaway', 'orders', 'kitchen', 'accounts', 'invoices', 'inventory', 'finances', 'reservations', 'branches']::TEXT[];

-- 3. Create platform_admins table for SuperAdmin users
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'superadmin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 5. Policies: Platform admins can view and manage platform_admins
CREATE POLICY "Platform admins can view platform_admins" 
ON public.platform_admins
FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
));

CREATE POLICY "Platform admins can manage platform_admins" 
ON public.platform_admins
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
));

