CREATE TABLE restaurant_payment_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    bank_name VARCHAR(50) NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE restaurant_payment_integrations ENABLE ROW LEVEL SECURITY;

-- Allow restaurant owners to see their own integrations
CREATE POLICY "Users can view their own payment integrations"
    ON restaurant_payment_integrations FOR SELECT
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert their own payment integrations"
    ON restaurant_payment_integrations FOR INSERT
    WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update their own payment integrations"
    ON restaurant_payment_integrations FOR UPDATE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete their own payment integrations"
    ON restaurant_payment_integrations FOR DELETE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

