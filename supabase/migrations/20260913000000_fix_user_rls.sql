DROP POLICY IF EXISTS "Users can view restaurant users" ON public.restaurant_users;

CREATE OR REPLACE FUNCTION public.get_auth_user_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM public.restaurant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users can view restaurant users"
ON public.restaurant_users
FOR SELECT
USING (
  restaurant_id = public.get_auth_user_restaurant_id()
);
