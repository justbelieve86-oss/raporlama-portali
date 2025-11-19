-- Add flag for KPIs that should be entered only as cumulative (no daily)

ALTER TABLE public.kpis
  ADD COLUMN IF NOT EXISTS only_cumulative boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.kpis.only_cumulative IS 'If true, daily entry is disabled and cumulative value is edited directly (monthly kpi_reports).';