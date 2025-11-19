-- Narrow grants on user_kpi_ordering to minimum required
-- Context: 011_user_kpi_ordering.sql granted ALL to authenticated.
-- We restrict to SELECT, INSERT, UPDATE; DELETE is controlled by RLS policy but not granted by default.

BEGIN;

-- Ensure table exists before altering grants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_kpi_ordering' AND c.relkind = 'r'
  ) THEN
    RAISE NOTICE 'Table public.user_kpi_ordering does not exist. Skipping grant adjustments.';
    RETURN;
  END IF;
END;
$$;

-- Revoke broad privileges
REVOKE ALL ON TABLE public.user_kpi_ordering FROM authenticated;
REVOKE ALL ON TABLE public.user_kpi_ordering FROM anon;

-- Grant minimal privileges; RLS policies still apply
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_kpi_ordering TO authenticated;

COMMIT;