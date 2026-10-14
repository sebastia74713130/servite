-- Migration: Normalize and clean restaurant enabled_modules
-- Description: Migrates legacy module keys ('tables', 'takeaway', 'orders&accounts', 'orders&acounts') 
-- to the canonical keys ('accounts' for salon tables and bills, 'orders' for takeaway orders).

CREATE OR REPLACE FUNCTION public.normalize_restaurant_modules(mods text[])
RETURNS text[] AS $$
DECLARE
    m text;
    normalized text[] := '{}';
BEGIN
    IF mods IS NULL THEN
        RETURN ARRAY['menu', 'accounts', 'orders', 'kitchen', 'invoices', 'finances', 'inventory', 'reservations', 'branches']::text[];
    END IF;

    FOREACH m IN ARRAY mods
    LOOP
        -- Map legacy keys to canonical
        IF m IN ('tables', 'accounts', 'orders&accounts', 'orders&acounts') THEN
            IF NOT ('accounts' = ANY(normalized)) THEN
                normalized := array_append(normalized, 'accounts');
            END IF;
        ELSIF m IN ('takeaway', 'orders') THEN
            IF NOT ('orders' = ANY(normalized)) THEN
                normalized := array_append(normalized, 'orders');
            END IF;
        ELSIF m IN ('menu', 'kitchen', 'invoices', 'finances', 'inventory', 'reservations', 'branches') THEN
            IF NOT (m = ANY(normalized)) THEN
                normalized := array_append(normalized, m);
            END IF;
        END IF;
    END LOOP;

    RETURN normalized;
END;
$$ LANGUAGE plpgsql;

-- Apply normalization to all existing restaurants
UPDATE public.restaurants
SET enabled_modules = public.normalize_restaurant_modules(enabled_modules)
WHERE enabled_modules IS NOT NULL;

-- Update the default value for new restaurants
ALTER TABLE public.restaurants 
ALTER COLUMN enabled_modules 
SET DEFAULT ARRAY['menu', 'accounts', 'orders', 'kitchen', 'invoices', 'finances', 'inventory', 'reservations', 'branches']::TEXT[];

