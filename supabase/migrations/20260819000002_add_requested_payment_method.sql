-- Add requested_payment_method to tables
ALTER TABLE public.tables 
ADD COLUMN requested_payment_method TEXT;

-- This field will be populated when a customer requests the bill and chooses their payment method
-- and will be cleared when the cashier closes the bill.
