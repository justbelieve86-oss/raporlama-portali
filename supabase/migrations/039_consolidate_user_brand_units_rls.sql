DO $$
BEGIN
  IF to_regclass('public.user_brand_units') IS NOT NULL THEN
    -- Drop existing conflicting policies for user_brand_units
    EXECUTE 'DROP POLICY IF EXISTS user_brand_units_admin_manage ON public.user_brand_units';
    EXECUTE 'DROP POLICY IF EXISTS user_brand_units_admin_select_all ON public.user_brand_units';
    EXECUTE 'DROP POLICY IF EXISTS user_brand_units_select_own ON public.user_brand_units';

    EXECUTE 'DROP POLICY IF EXISTS "Allow select for admins and own records" ON public.user_brand_units';
    EXECUTE $sql$
      CREATE POLICY "Allow select for admins and own records" ON public.user_brand_units
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
          )
          OR ((SELECT auth.uid()) = user_id)
        )
    $sql$;
  END IF;
END
$$;