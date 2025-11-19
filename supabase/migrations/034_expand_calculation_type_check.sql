-- Ensure kpis.calculation_type allows all expected values, including formula and target
-- Idempotent: drops existing constraint if present, then re-adds with expanded set

DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.kpis DROP CONSTRAINT IF EXISTS kpis_calculation_type_check;

  -- Recreate with expanded allowed values
  ALTER TABLE public.kpis
    ADD CONSTRAINT kpis_calculation_type_check
    CHECK (calculation_type IN ('direct', 'percentage', 'cumulative', 'formula', 'target'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint adjust skipped: %', SQLERRM;
END $$;