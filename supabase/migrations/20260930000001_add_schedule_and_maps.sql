ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{
  "monday": {"isOpen": true, "open": "09:00", "close": "22:00"},
  "tuesday": {"isOpen": true, "open": "09:00", "close": "22:00"},
  "wednesday": {"isOpen": true, "open": "09:00", "close": "22:00"},
  "thursday": {"isOpen": true, "open": "09:00", "close": "22:00"},
  "friday": {"isOpen": true, "open": "09:00", "close": "23:00"},
  "saturday": {"isOpen": true, "open": "09:00", "close": "23:00"},
  "sunday": {"isOpen": true, "open": "09:00", "close": "16:00"}
}'::jsonb;
