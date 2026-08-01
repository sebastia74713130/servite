-- ==========================================
-- SCRIPT DE CREACIÓN DE TABLAS DE INVENTARIO Y CAJA
-- ==========================================

-- 1. Cajas (Turnos de trabajo)
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    opening_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(10, 2),
    opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insumos (Artículos de Inventario)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- kg, l, unidades, gramos
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fichas Técnicas (Recetas de Productos)
CREATE TABLE IF NOT EXISTS public.product_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC(10, 4) NOT NULL, -- Cantidad que se descuenta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, inventory_item_id)
);

-- Intentar habilitar RLS si no estaban habilitadas
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

-- Evitar errores si las políticas ya existen usando excepciones o simplemente dropeándolas primero (opcional, pero más seguro es no recrearlas o recrearlas)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated full access to cash_registers" ON public.cash_registers;
    DROP POLICY IF EXISTS "Authenticated full access to inventory_items" ON public.inventory_items;
    DROP POLICY IF EXISTS "Authenticated full access to product_recipes" ON public.product_recipes;
END $$;

CREATE POLICY "Authenticated full access to cash_registers" ON public.cash_registers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to inventory_items" ON public.inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to product_recipes" ON public.product_recipes FOR ALL USING (auth.role() = 'authenticated');

-- =========================================================
-- IMPORTANTE: ALTER TABLE de orders por si faltan columnas
-- =========================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='cash_register_id') THEN
        ALTER TABLE public.orders ADD COLUMN cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paid_at') THEN
        ALTER TABLE public.orders ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
