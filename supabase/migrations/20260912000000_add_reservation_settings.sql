-- Add reservation_settings to restaurants
ALTER TABLE public.restaurants
ADD COLUMN reservation_settings JSONB DEFAULT '{
  "open_time": "12:00",
  "close_time": "22:00",
  "interval_minutes": 30,
  "days_available": [0, 1, 2, 3, 4, 5, 6]
}'::jsonb;

