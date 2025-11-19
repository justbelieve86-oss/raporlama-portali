-- Add target-related fields to KPIs: has_target_data flag and target_formula_text

ALTER TABLE public.kpis
  ADD COLUMN IF NOT EXISTS has_target_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_formula_text text;

COMMENT ON COLUMN public.kpis.has_target_data IS 'If true, KPI has target data managed/calculated via target_formula_text or external target records';
COMMENT ON COLUMN public.kpis.target_formula_text IS 'Optional human-readable target formula expression referencing other KPIs by name';