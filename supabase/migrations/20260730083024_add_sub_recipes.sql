-- Agregar soporte para sub-recetas (insumos compuestos)
CREATE TABLE public.inventory_item_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    ingredient_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_item_id, ingredient_item_id)
);

ALTER TABLE public.inventory_item_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access to inventory_item_recipes" ON public.inventory_item_recipes FOR ALL USING (auth.role() = 'authenticated');

-- Actualizar el trigger para soportar 1 nivel de sub-recetas al vuelo
CREATE OR REPLACE FUNCTION deduct_inventory_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_recipe RECORD;
  v_prep_recipe RECORD;
BEGIN
  -- Check if order just became paid
  IF NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false) THEN
    
    -- Loop through all order items for this order
    FOR v_item IN (SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id) LOOP
      
      -- Loop through the recipe for each product
      FOR v_recipe IN (SELECT inventory_item_id, quantity_required FROM product_recipes WHERE product_id = v_item.product_id) LOOP
        
        -- Si este ingrediente es una preparacion (tiene sub-receta)
        IF EXISTS (SELECT 1 FROM inventory_item_recipes WHERE parent_item_id = v_recipe.inventory_item_id) THEN
          -- Es preparacion al vuelo: descontamos sus ingredientes hijos proporcionalmente
          FOR v_prep_recipe IN (SELECT ingredient_item_id, quantity_required FROM inventory_item_recipes WHERE parent_item_id = v_recipe.inventory_item_id) LOOP
             UPDATE inventory_items
             SET current_stock = current_stock - (v_prep_recipe.quantity_required * v_recipe.quantity_required * v_item.quantity)
             WHERE id = v_prep_recipe.ingredient_item_id;
          END LOOP;
        ELSE
          -- Es materia prima normal, la descontamos
          UPDATE inventory_items
          SET current_stock = current_stock - (v_recipe.quantity_required * v_item.quantity)
          WHERE id = v_recipe.inventory_item_id;
        END IF;

      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
