-- Migración: Inventarios y Finanzas (Cuentas)
-- Habilita el manejo de stock por recetas, apertura/cierre de cajas y gestión de proveedores.

-- ==========================================
-- 1. MÓDULO DE FINANZAS (CAJAS Y EGRESOS)
-- ==========================================

-- Cajas (Turnos de trabajo)
CREATE TABLE public.cash_registers (
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

-- Egresos (Gastos)
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- ej. Insumos, Servicios, Salarios
    payment_method TEXT NOT NULL, -- ej. Efectivo, Tarjeta, Transferencia
    registered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modificar tabla Orders para enlazarlas con los pagos y la caja
ALTER TABLE public.orders 
ADD COLUMN payment_method TEXT,
ADD COLUMN cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;


-- ==========================================
-- 2. MÓDULO DE INVENTARIO Y RECETAS
-- ==========================================

-- Insumos (Artículos de Inventario)
CREATE TABLE public.inventory_items (
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

-- Fichas Técnicas (Recetas de Productos)
-- Define qué insumos gasta un producto al venderse
CREATE TABLE public.product_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC(10, 4) NOT NULL, -- Cantidad que se descuenta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, inventory_item_id)
);


-- ==========================================
-- 3. MÓDULO DE PROVEEDORES (COMPRAS)
-- ==========================================

-- Listas de Compra (Órdenes a proveedores)
CREATE TABLE public.purchase_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    supplier_name TEXT, -- Opcional, si va dirigido a alguien
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')) DEFAULT 'draft',
    total_cost NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Ítems de la Lista de Compra
CREATE TABLE public.purchase_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_list_id UUID NOT NULL REFERENCES public.purchase_lists(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_needed NUMERIC(10, 2) NOT NULL,
    unit_cost NUMERIC(10, 2), -- Costo al momento de comprar
    is_received BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 4. POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_list_items ENABLE ROW LEVEL SECURITY;

-- Políticas para personal autenticado (MVP: full access para dueños/staff)
CREATE POLICY "Authenticated full access to cash_registers" ON public.cash_registers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to expenses" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to inventory_items" ON public.inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to product_recipes" ON public.product_recipes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to purchase_lists" ON public.purchase_lists FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access to purchase_list_items" ON public.purchase_list_items FOR ALL USING (auth.role() = 'authenticated');

-- Realtime
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_registers;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_lists;
COMMIT;
