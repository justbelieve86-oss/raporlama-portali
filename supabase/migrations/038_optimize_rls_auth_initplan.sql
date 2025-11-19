-- Optimize RLS policies to avoid per-row re-evaluation of auth.* functions
-- Replace direct calls to auth.uid() with (SELECT auth.uid()) across policies
-- Idempotent ALTER POLICY statements

-- user_kpi_ordering policies
ALTER POLICY "Users can view their own KPI ordering" ON public.user_kpi_ordering
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert their own KPI ordering" ON public.user_kpi_ordering
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update their own KPI ordering" ON public.user_kpi_ordering
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can delete their own KPI ordering" ON public.user_kpi_ordering
  USING ((SELECT auth.uid()) = user_id);

-- kpi_reports policies
ALTER POLICY kpi_reports_select_policy ON public.kpi_reports
  USING (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

ALTER POLICY kpi_reports_insert_policy ON public.kpi_reports
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

ALTER POLICY kpi_reports_update_policy ON public.kpi_reports
  USING (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

ALTER POLICY kpi_reports_delete_policy ON public.kpi_reports
  USING (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

-- brand_kpi_targets policies
ALTER POLICY brand_kpi_targets_select_policy ON public.brand_kpi_targets
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.brand_kpi_targets.brand_id::text
    )
  );

ALTER POLICY brand_kpi_targets_insert_policy ON public.brand_kpi_targets
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.brand_kpi_targets.brand_id::text
    )
  );

ALTER POLICY brand_kpi_targets_update_policy ON public.brand_kpi_targets
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.brand_kpi_targets.brand_id::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.brand_kpi_targets.brand_id::text
    )
  );

ALTER POLICY brand_kpi_targets_delete_policy ON public.brand_kpi_targets
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id::text = public.brand_kpi_targets.brand_id::text
    )
  );

-- kpi_daily_reports policies
ALTER POLICY kdr_select_own_authorized ON public.kpi_daily_reports
  USING (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

ALTER POLICY kdr_insert_own_authorized ON public.kpi_daily_reports
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
        AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

ALTER POLICY kdr_update_own ON public.kpi_daily_reports
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY kdr_delete_own ON public.kpi_daily_reports
  USING ((SELECT auth.uid()) = user_id);