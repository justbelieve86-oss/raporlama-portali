-- Add source KPI references for percentage-based calculations

-- Add columns for percentage calculation sources
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS numerator_kpi_id uuid REFERENCES public.kpis(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS denominator_kpi_id uuid REFERENCES public.kpis(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS calculation_type text CHECK (calculation_type IN ('direct', 'percentage')) DEFAULT 'direct';

-- Add comment to explain the new columns
COMMENT ON COLUMN public.kpis.numerator_kpi_id IS 'For percentage KPIs: the KPI used as numerator in the calculation';
COMMENT ON COLUMN public.kpis.denominator_kpi_id IS 'For percentage KPIs: the KPI used as denominator in the calculation';
COMMENT ON COLUMN public.kpis.calculation_type IS 'Type of calculation: direct (normal KPI) or percentage (calculated from other KPIs)';

-- Update existing KPIs to have 'direct' calculation type
UPDATE public.kpis SET calculation_type = 'direct' WHERE calculation_type IS NULL;