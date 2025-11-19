-- Migration: Optimize query indexes for better performance
-- Description: Add composite indexes for common query patterns to reduce N+1 query problems

BEGIN;

-- kpi_daily_reports: Composite index for user_id + year + month queries
-- Used in /api/user/summary endpoint
CREATE INDEX IF NOT EXISTS idx_kpi_daily_reports_user_year_month 
  ON public.kpi_daily_reports (user_id, year, month);

-- user_brand_kpis: Composite index for brand_id + kpi_id queries
-- Used in /api/user/summary endpoint for batch queries
CREATE INDEX IF NOT EXISTS idx_user_brand_kpis_brand_kpi 
  ON public.user_brand_kpis (brand_id, kpi_id);

-- brand_kpi_mappings: Composite index already exists via UNIQUE constraint
-- But add explicit index for better query planning (if not already covered)
-- Note: UNIQUE constraint already creates an index, but explicit index helps with query planning
CREATE INDEX IF NOT EXISTS idx_brand_kpi_mappings_brand_kpi 
  ON public.brand_kpi_mappings (brand_id, kpi_id);

-- kpi_reports: Composite index for brand_id + year + month queries
-- Used in /api/reports/monthly endpoint
CREATE INDEX IF NOT EXISTS idx_kpi_reports_brand_year_month 
  ON public.kpi_reports (brand_id, year, month);

-- kpi_reports: Composite index for brand_id + year + month + kpi_id queries
-- Used in /api/reports/monthly/user endpoint
CREATE INDEX IF NOT EXISTS idx_kpi_reports_brand_year_month_kpi 
  ON public.kpi_reports (brand_id, year, month, kpi_id);

-- kpi_daily_reports: Composite index for brand_id + year + month + day queries
-- Used in /api/reports/daily endpoint
CREATE INDEX IF NOT EXISTS idx_kpi_daily_reports_brand_year_month_day 
  ON public.kpi_daily_reports (brand_id, year, month, day);

COMMIT;

