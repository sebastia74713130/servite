ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access to cash_registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Authenticated full access to inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Authenticated full access to product_recipes" ON public.product_recipes;

CREATE POLICY "Authenticated full access to cash_registers" ON public.cash_registers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to inventory_items" ON public.inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to product_recipes" ON public.product_recipes FOR ALL USING (auth.role() = 'authenticated');
