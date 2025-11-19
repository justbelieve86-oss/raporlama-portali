-- Add update policy for kpi_formulas table

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpi_formulas' AND policyname = 'kpi_formulas_update'
  ) THEN
    CREATE POLICY kpi_formulas_update ON public.kpi_formulas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;