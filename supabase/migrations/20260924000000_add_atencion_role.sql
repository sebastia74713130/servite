-- Remove the old check constraint
ALTER TABLE public.restaurant_users DROP CONSTRAINT IF EXISTS restaurant_users_role_check;

-- Add the new check constraint including 'waitstaff'
ALTER TABLE public.restaurant_users ADD CONSTRAINT restaurant_users_role_check CHECK (role IN ('owner', 'admin', 'kitchen', 'waitstaff'));
