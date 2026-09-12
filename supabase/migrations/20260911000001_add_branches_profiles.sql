-- Add branch_id and profile data to restaurant_users
ALTER TABLE public.restaurant_users
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN name TEXT;

-- Policy to allow viewing users within the same restaurant
CREATE POLICY "Users can view restaurant users"
ON public.restaurant_users
FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.restaurant_users WHERE user_id = auth.uid()
  )
);

