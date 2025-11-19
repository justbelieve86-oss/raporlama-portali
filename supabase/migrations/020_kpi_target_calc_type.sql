-- Extend calculation_type to include 'target' type for KPI targets
-- This updates the CHECK constraint to allow: direct, percentage, cumulative, formula, target

DO $$
BEGIN
  -- Drop existing calculation_type check constraint if present
  BEGIN
    ALTER TABLE public.kpis DROP CONSTRAINT IF EXISTS kpis_calculation_type_check;
  EXCEPTION WHEN undefined_object THEN
    NULL; -- ignore if it doesn't exist
  END;

  -- Recreate constraint including 'target'
  ALTER TABLE public.kpis ADD CONSTRAINT kpis_calculation_type_check CHECK (
    calculation_type IN ('direct', 'percentage', 'cumulative', 'formula', 'target')
  );
END $$;

COMMENT ON COLUMN public.kpis.calculation_type IS 'Type of calculation: direct (manual), percentage (numerator/denominator), cumulative (sum of sources), formula (computed expression), target (managed via brand_kpi_targets)';