-- Migration: Create model_based_sales table for model-based sales data entry
-- Description: This table stores daily sales data per model (baglanti, fatura, fatura_baglanti, hedef)

BEGIN;

-- Create model_based_sales table
CREATE TABLE IF NOT EXISTS public.model_based_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.brand_models(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  baglanti NUMERIC(18,2) DEFAULT NULL,
  fatura NUMERIC(18,2) DEFAULT NULL,
  fatura_baglanti NUMERIC(18,2) DEFAULT NULL,
  hedef NUMERIC(18,2) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(user_id, brand_id, model_id, date)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_model_based_sales_user_id ON public.model_based_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_model_based_sales_brand_id ON public.model_based_sales(brand_id);
CREATE INDEX IF NOT EXISTS idx_model_based_sales_model_id ON public.model_based_sales(model_id);
CREATE INDEX IF NOT EXISTS idx_model_based_sales_date ON public.model_based_sales(date);
CREATE INDEX IF NOT EXISTS idx_model_based_sales_brand_date ON public.model_based_sales(brand_id, date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS model_based_sales_set_updated_at ON public.model_based_sales;
CREATE TRIGGER model_based_sales_set_updated_at
BEFORE UPDATE ON public.model_based_sales
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.model_based_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view/modify sales data for brands they have access to

-- Drop existing policies if they exist
DROP POLICY IF EXISTS model_based_sales_select_policy ON public.model_based_sales;
DROP POLICY IF EXISTS model_based_sales_insert_policy ON public.model_based_sales;
DROP POLICY IF EXISTS model_based_sales_update_policy ON public.model_based_sales;
DROP POLICY IF EXISTS model_based_sales_delete_policy ON public.model_based_sales;

-- SELECT: Users can view sales data for brands they have access to
CREATE POLICY model_based_sales_select_policy ON public.model_based_sales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = model_based_sales.brand_id
      AND user_brands.user_id = auth.uid()
    )
  );

-- INSERT: Users can create sales data for brands they have access to
CREATE POLICY model_based_sales_insert_policy ON public.model_based_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = model_based_sales.brand_id
      AND user_brands.user_id = auth.uid()
    )
    AND model_based_sales.user_id = auth.uid()
  );

-- UPDATE: Users can update sales data for brands they have access to
CREATE POLICY model_based_sales_update_policy ON public.model_based_sales
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = model_based_sales.brand_id
      AND user_brands.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = model_based_sales.brand_id
      AND user_brands.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete sales data for brands they have access to
CREATE POLICY model_based_sales_delete_policy ON public.model_based_sales
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = model_based_sales.brand_id
      AND user_brands.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.model_based_sales IS 'Daily sales data per model (baglanti, fatura, fatura_baglanti, hedef)';
COMMENT ON COLUMN public.model_based_sales.user_id IS 'User who entered the data';
COMMENT ON COLUMN public.model_based_sales.brand_id IS 'Brand the model belongs to';
COMMENT ON COLUMN public.model_based_sales.model_id IS 'Model the sales data is for';
COMMENT ON COLUMN public.model_based_sales.date IS 'Date of the sales data (daily entry)';
COMMENT ON COLUMN public.model_based_sales.baglanti IS 'Connection value';
COMMENT ON COLUMN public.model_based_sales.fatura IS 'Invoice value';
COMMENT ON COLUMN public.model_based_sales.fatura_baglanti IS 'Invoice + Connection value (can be auto-calculated or manual)';
COMMENT ON COLUMN public.model_based_sales.hedef IS 'Target value';

COMMIT;

