DO $$
BEGIN
  IF to_regclass('public.brand_unit_kpis') IS NOT NULL THEN
    -- Drop existing conflicting policies for brand_unit_kpis
    EXECUTE 'DROP POLICY IF EXISTS brand_unit_kpis_admin_manage ON public.brand_unit_kpis';
    EXECUTE 'DROP POLICY IF EXISTS brand_unit_kpis_select_all ON public.brand_unit_kpis';
    EXECUTE 'DROP POLICY IF EXISTS "Allow select for admins on brand_unit_kpis" ON public.brand_unit_kpis';

    -- Create a single consolidated SELECT policy for brand_unit_kpis
    EXECUTE $sql$
      CREATE POLICY "Allow select for admins on brand_unit_kpis" ON public.brand_unit_kpis
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
          )
        )
    $sql$;
  END IF;
END
$$;