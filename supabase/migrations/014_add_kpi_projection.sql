-- Add projection field to KPIs table

-- Add projection column for yearly target projection
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS projection numeric;

-- Add comment to explain the projection column
COMMENT ON COLUMN public.kpis.projection IS 'Yearly target projection value for the KPI';