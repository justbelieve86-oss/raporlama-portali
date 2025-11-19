-- Migration: Add stok and tahsis columns to model_based_sales table
-- Description: Add missing columns for stock and allocation data in model-based sales entry

BEGIN;

-- Add stok column
ALTER TABLE public.model_based_sales
ADD COLUMN IF NOT EXISTS stok NUMERIC(18,2) DEFAULT NULL;

-- Add tahsis column
ALTER TABLE public.model_based_sales
ADD COLUMN IF NOT EXISTS tahsis NUMERIC(18,2) DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.model_based_sales.stok IS 'Stock value for the model';
COMMENT ON COLUMN public.model_based_sales.tahsis IS 'Allocation value for the model';

COMMIT;

