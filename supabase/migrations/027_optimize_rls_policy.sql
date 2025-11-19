ALTER POLICY ubk_select_own ON public.user_brand_kpis
    USING ( (select auth.uid()) = user_id );