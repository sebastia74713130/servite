CREATE TABLE IF NOT EXISTS restaurant_payment_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    bank_name VARCHAR(50) NOT NULL DEFAULT 'Banco Económico',
    account_number TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE restaurant_payment_integrations ENABLE ROW LEVEL SECURITY;

-- Simple policies following the existing schema pattern
CREATE POLICY "Authenticated users can manage payment integrations"
    ON restaurant_payment_integrations FOR ALL
    USING (auth.role() = 'authenticated');

