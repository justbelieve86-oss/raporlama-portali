-- Add covering indexes for foreign keys flagged by linter
-- This improves FK enforcement performance and common query patterns.

BEGIN;

-- brand_kpi_targets: FK on kpi_id needs a leading-column index
CREATE INDEX IF NOT EXISTS brand_kpi_targets_kpi_id_idx
  ON public.brand_kpi_targets (kpi_id);

-- kpi_cumulative_sources: FK on source_kpi_id needs a leading-column index
CREATE INDEX IF NOT EXISTS kpi_cumulative_sources_source_kpi_id_idx
  ON public.kpi_cumulative_sources (source_kpi_id);

-- kpi_daily_reports: FKs on brand_id and kpi_id
CREATE INDEX IF NOT EXISTS kpi_daily_reports_brand_id_idx
  ON public.kpi_daily_reports (brand_id);
CREATE INDEX IF NOT EXISTS kpi_daily_reports_kpi_id_idx
  ON public.kpi_daily_reports (kpi_id);

-- kpi_reports: FKs on brand_id and kpi_id
CREATE INDEX IF NOT EXISTS kpi_reports_brand_id_idx
  ON public.kpi_reports (brand_id);
CREATE INDEX IF NOT EXISTS kpi_reports_kpi_id_idx
  ON public.kpi_reports (kpi_id);

-- kpis: self-referencing FKs numerator_kpi_id and denominator_kpi_id
CREATE INDEX IF NOT EXISTS kpis_numerator_kpi_id_idx
  ON public.kpis (numerator_kpi_id);
CREATE INDEX IF NOT EXISTS kpis_denominator_kpi_id_idx
  ON public.kpis (denominator_kpi_id);

-- user_brand_kpis: FKs on brand_id and kpi_id
CREATE INDEX IF NOT EXISTS user_brand_kpis_brand_id_idx
  ON public.user_brand_kpis (brand_id);
CREATE INDEX IF NOT EXISTS user_brand_kpis_kpi_id_idx
  ON public.user_brand_kpis (kpi_id);

-- user_brands: FK on brand_id
CREATE INDEX IF NOT EXISTS user_brands_brand_id_idx
  ON public.user_brands (brand_id);

-- user_kpi_ordering: add single-column indexes to satisfy FK coverage
CREATE INDEX IF NOT EXISTS user_kpi_ordering_brand_id_idx
  ON public.user_kpi_ordering (brand_id);
CREATE INDEX IF NOT EXISTS user_kpi_ordering_kpi_id_idx
  ON public.user_kpi_ordering (kpi_id);

-- Drop unused redundant index (covered by idx_user_kpi_ordering_order)
DROP INDEX IF EXISTS idx_user_kpi_ordering_user_brand;

COMMIT;