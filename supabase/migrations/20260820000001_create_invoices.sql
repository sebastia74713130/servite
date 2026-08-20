-- Create invoices table to track SIAT emission
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Nullable if it's a test invoice
    cuf TEXT NOT NULL,
    numero_factura INTEGER NOT NULL,
    xml_signed TEXT,
    siat_estado TEXT DEFAULT 'PENDIENTE', -- VALIDADA, OBSERVADA, RECHAZADA, ANULADA
    codigo_recepcion TEXT,
    detalles_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
CREATE POLICY "Authenticated users can view their invoices" 
ON public.invoices FOR SELECT 
TO authenticated 
USING (restaurant_id IN (
  SELECT restaurant_id FROM public.restaurant_users WHERE user_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert invoices" 
ON public.invoices FOR INSERT 
TO authenticated 
WITH CHECK (true); -- In a real app restrict to restaurant staff/owner

CREATE POLICY "Authenticated users can update invoices" 
ON public.invoices FOR UPDATE 
TO authenticated 
USING (true);

-- Index for quick lookup by CUF
CREATE INDEX IF NOT EXISTS idx_invoices_cuf ON public.invoices(cuf);
