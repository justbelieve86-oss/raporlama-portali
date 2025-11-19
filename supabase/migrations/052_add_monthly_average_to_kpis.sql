-- Migration: Add monthly_average column to kpis table
-- Description: This column indicates if the KPI should calculate monthly average using numerator/denominator

BEGIN;

-- Add monthly_average column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpis' AND column_name = 'monthly_average') THEN
        ALTER TABLE public.kpis ADD COLUMN monthly_average BOOLEAN NOT NULL DEFAULT false;
    END IF;
END;
$$;

COMMIT;

