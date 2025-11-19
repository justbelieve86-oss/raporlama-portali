-- Fix Supabase Performance/Security Lints
-- - Resolve auth_rls_initplan by using (SELECT auth.uid()) inside RLS policies
-- - Resolve multiple_permissive_policies by dropping legacy/overlapping policies

BEGIN;

-- 1) user_brand_kpis: replace direct auth.uid() with (SELECT auth.uid())
DO $$
BEGIN
  IF to_regclass('public.user_brand_kpis') IS NOT NULL THEN
    -- ubk_select_own
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_brand_kpis' AND policyname = 'ubk_select_own'
    ) THEN
      ALTER POLICY ubk_select_own ON public.user_brand_kpis
        USING ((SELECT auth.uid()) = user_id);
    END IF;

    -- ubk_insert_authorized
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_brand_kpis' AND policyname = 'ubk_insert_authorized'
    ) THEN
      ALTER POLICY ubk_insert_authorized ON public.user_brand_kpis
        WITH CHECK (
          (SELECT auth.uid()) = user_id AND
          EXISTS (
            SELECT 1
            FROM public.user_brands ub
            WHERE ub.user_id = (SELECT auth.uid())
              AND ub.brand_id = brand_id
          )
        );
    END IF;

    -- ubk_delete_own
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_brand_kpis' AND policyname = 'ubk_delete_own'
    ) THEN
      ALTER POLICY ubk_delete_own ON public.user_brand_kpis
        USING ((SELECT auth.uid()) = user_id);
    END IF;
  END IF;
END$$;

-- 2) kpi_reports: drop legacy overlapping permissive policies
DO $$
BEGIN
  IF to_regclass('public.kpi_reports') IS NOT NULL THEN
    -- Remove legacy policies that cause multiple_permissive_policies
    DROP POLICY IF EXISTS kpi_reports_admin_manage_all ON public.kpi_reports;
    DROP POLICY IF EXISTS kpi_reports_select_own_or_unit ON public.kpi_reports;
    DROP POLICY IF EXISTS kpi_reports_insert_unit_authorized ON public.kpi_reports;
    DROP POLICY IF EXISTS kpi_reports_update_own_unit ON public.kpi_reports;
    DROP POLICY IF EXISTS kpi_reports_delete_own_unit ON public.kpi_reports;
    -- The consolidated policies (kpi_reports_select_policy/insert_policy/update_policy/delete_policy)
    -- remain in place from previous migrations and are already optimized.
  END IF;
END$$;

-- 3) brand_units: consolidate SELECT policies (avoid multiple permissive)
DO $$
BEGIN
  IF to_regclass('public.brand_units') IS NOT NULL THEN
    -- Drop any existing overlapping policies
    DROP POLICY IF EXISTS brand_units_admin_manage ON public.brand_units;
    DROP POLICY IF EXISTS brand_units_select_all ON public.brand_units;
    DROP POLICY IF EXISTS "Allow select for admins on brand_units" ON public.brand_units;

    -- Create a single, explicit admin-only SELECT policy
    CREATE POLICY "Allow select for admins on brand_units" ON public.brand_units
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
        )
      );
  END IF;
END$$;

COMMIT;