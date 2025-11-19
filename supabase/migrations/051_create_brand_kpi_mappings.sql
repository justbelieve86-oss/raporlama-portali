-- Migration: Create brand_kpi_mappings table for shared KPI lists
-- Description: This table stores KPI mappings at the brand level (not user-specific)
-- All users with access to a brand will see the same KPI list

BEGIN;

-- Create brand_kpi_mappings table
CREATE TABLE IF NOT EXISTS public.brand_kpi_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(brand_id, kpi_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_kpi_mappings_brand_id ON public.brand_kpi_mappings(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_kpi_mappings_kpi_id ON public.brand_kpi_mappings(kpi_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brand_kpi_mappings_set_updated_at ON public.brand_kpi_mappings;
CREATE TRIGGER brand_kpi_mappings_set_updated_at
BEFORE UPDATE ON public.brand_kpi_mappings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.brand_kpi_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view/modify KPI mappings for brands they have access to

-- Drop existing policies if they exist
DROP POLICY IF EXISTS brand_kpi_mappings_select_policy ON public.brand_kpi_mappings;
DROP POLICY IF EXISTS brand_kpi_mappings_insert_policy ON public.brand_kpi_mappings;
DROP POLICY IF EXISTS brand_kpi_mappings_update_policy ON public.brand_kpi_mappings;
DROP POLICY IF EXISTS brand_kpi_mappings_delete_policy ON public.brand_kpi_mappings;

-- SELECT: Users can view KPI mappings for brands they have access to
CREATE POLICY brand_kpi_mappings_select_policy ON public.brand_kpi_mappings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.brand_kpi_mappings.brand_id
    )
  );

-- INSERT: Users can add KPI mappings for brands they have access to
CREATE POLICY brand_kpi_mappings_insert_policy ON public.brand_kpi_mappings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.brand_kpi_mappings.brand_id
    )
  );

-- UPDATE: Users can update KPI mappings for brands they have access to
CREATE POLICY brand_kpi_mappings_update_policy ON public.brand_kpi_mappings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.brand_kpi_mappings.brand_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.brand_kpi_mappings.brand_id
    )
  );

-- DELETE: Users can delete KPI mappings for brands they have access to
CREATE POLICY brand_kpi_mappings_delete_policy ON public.brand_kpi_mappings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.brand_kpi_mappings.brand_id
    )
  );

-- Migrate existing data from user_brand_kpis to brand_kpi_mappings
-- This will create unique brand-KPI pairs from all user-specific mappings
INSERT INTO public.brand_kpi_mappings (brand_id, kpi_id)
SELECT DISTINCT brand_id, kpi_id
FROM public.user_brand_kpis
ON CONFLICT (brand_id, kpi_id) DO NOTHING;

COMMIT;

