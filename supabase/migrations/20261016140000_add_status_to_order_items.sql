-- Migration: Add status column to order_items to support individual product status tracking
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received';
