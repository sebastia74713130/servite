-- Allow public to update tables (needed for calling waiter and requesting bill)
CREATE POLICY "Public can update tables" ON public.tables FOR UPDATE USING (true);
