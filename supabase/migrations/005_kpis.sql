-- Create kpis table and basic RLS policies

-- Ensure pgcrypto for gen_random_uuid (Supabase usually has it enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL,
  status text NOT NULL CHECK (status IN ('aktif','pasif')) DEFAULT 'aktif',
  report_count integer NOT NULL DEFAULT 0,
  ytd_calc text NOT NULL CHECK (ytd_calc IN ('ortalama','toplam')) DEFAULT 'ortalama',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kpis_set_updated_at ON public.kpis;
CREATE TRIGGER kpis_set_updated_at
BEFORE UPDATE ON public.kpis
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users basic CRUD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpis' AND policyname = 'kpis_select_authenticated'
  ) THEN
    CREATE POLICY kpis_select_authenticated ON public.kpis
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpis' AND policyname = 'kpis_insert_authenticated'
  ) THEN
    CREATE POLICY kpis_insert_authenticated ON public.kpis
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpis' AND policyname = 'kpis_update_authenticated'
  ) THEN
    CREATE POLICY kpis_update_authenticated ON public.kpis
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpis' AND policyname = 'kpis_delete_authenticated'
  ) THEN
    CREATE POLICY kpis_delete_authenticated ON public.kpis
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;