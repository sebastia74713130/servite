-- Add temporary SIAT billing data to tables
ALTER TABLE public.tables 
ADD COLUMN siat_customer_nit TEXT,
ADD COLUMN siat_customer_name TEXT,
ADD COLUMN siat_customer_email TEXT;

-- These fields will be populated when a customer requests the bill from their phone
-- and will be cleared when the cashier closes the bill.
