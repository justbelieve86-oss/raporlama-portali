-- Add target field to KPIs
alter table public.kpis
  add column if not exists target numeric(18,2);