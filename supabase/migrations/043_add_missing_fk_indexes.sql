-- Address Supabase linter (INFO) findings for unindexed foreign keys
-- Adds covering indexes for:
--  - public.brand_unit_kpis(kpi_id)
--  - public.user_brand_units(brand_unit_id)

BEGIN;

-- brand_unit_kpis: FK on kpi_id needs a leading-column index
DO $$
BEGIN
  IF to_regclass('public.brand_unit_kpis') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS brand_unit_kpis_kpi_id_idx
    ON public.brand_unit_kpis (kpi_id);
  END IF;
END $$;

-- user_brand_units: FK on brand_unit_id needs a leading-column index
DO $$
BEGIN
  IF to_regclass('public.user_brand_units') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS user_brand_units_brand_unit_id_idx
    ON public.user_brand_units (brand_unit_id);
  END IF;
END $$;

COMMIT;