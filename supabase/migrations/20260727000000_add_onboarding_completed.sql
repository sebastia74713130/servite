-- Add onboarding_completed flag to restaurants table
ALTER TABLE public.restaurants ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
