ALTER POLICY ubk_insert_authorized ON public.user_brand_kpis
    WITH CHECK (
        (select auth.uid()) = user_id
        AND EXISTS (
            SELECT 1
            FROM public.user_brands ub
            WHERE ub.user_id = (SELECT auth.uid()) AND ub.brand_id = brand_id
        )
    );