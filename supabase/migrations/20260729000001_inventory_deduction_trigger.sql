CREATE OR REPLACE FUNCTION deduct_inventory_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_recipe RECORD;
BEGIN
  -- Check if order just became paid
  IF NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false) THEN
    
    -- Loop through all order items for this order
    FOR v_item IN (SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id) LOOP
      
      -- Loop through the recipe for each product
      FOR v_recipe IN (SELECT inventory_item_id, quantity_required FROM product_recipes WHERE product_id = v_item.product_id) LOOP
        
        -- Deduct from inventory_items
        UPDATE inventory_items
        SET current_stock = current_stock - (v_recipe.quantity_required * v_item.quantity)
        WHERE id = v_recipe.inventory_item_id;
        
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_inventory ON orders;

CREATE TRIGGER trg_deduct_inventory
AFTER UPDATE OF is_paid ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_payment();
