-- Migration: Create brand_models table for model management
-- Description: This table stores models associated with brands

BEGIN;

-- Create brand_models table
CREATE TABLE IF NOT EXISTS public.brand_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'pasif', 'kayitli')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(brand_id, name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_models_brand_id ON public.brand_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_models_status ON public.brand_models(status);
CREATE INDEX IF NOT EXISTS idx_brand_models_name ON public.brand_models(name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brand_models_set_updated_at ON public.brand_models;
CREATE TRIGGER brand_models_set_updated_at
BEFORE UPDATE ON public.brand_models
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.brand_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view/modify models for brands they have access to

-- Drop existing policies if they exist
DROP POLICY IF EXISTS brand_models_select_policy ON public.brand_models;
DROP POLICY IF EXISTS brand_models_insert_policy ON public.brand_models;
DROP POLICY IF EXISTS brand_models_update_policy ON public.brand_models;
DROP POLICY IF EXISTS brand_models_delete_policy ON public.brand_models;

-- SELECT: Users can view models for brands they have access to
CREATE POLICY brand_models_select_policy ON public.brand_models
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = brand_models.brand_id
      AND user_brands.user_id = auth.uid()
    )
  );

-- INSERT: Users can create models for brands they have access to
CREATE POLICY brand_models_insert_policy ON public.brand_models
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = brand_models.brand_id
      AND user_brands.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update models for brands they have access to
CREATE POLICY brand_models_update_policy ON public.brand_models
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = brand_models.brand_id
      AND user_brands.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = brand_models.brand_id
      AND user_brands.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete models for brands they have access to
CREATE POLICY brand_models_delete_policy ON public.brand_models
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands
      WHERE user_brands.brand_id = brand_models.brand_id
      AND user_brands.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.brand_models IS 'Models associated with brands';
COMMENT ON COLUMN public.brand_models.brand_id IS 'Foreign key to brands table';
COMMENT ON COLUMN public.brand_models.name IS 'Model name (unique per brand)';
COMMENT ON COLUMN public.brand_models.status IS 'Model status: aktif, pasif, or kayitli';

COMMIT;

