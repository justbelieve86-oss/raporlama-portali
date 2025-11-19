-- Migration: Enable shared data entry for all users
-- Description: Update INSERT/UPDATE/DELETE policies to allow all authorized users to modify data for brands they have access to
-- This enables collaborative data entry where any authorized user can add/edit/delete data for shared brands

BEGIN;

-- ============================================
-- kpi_daily_reports (Daily Reports) Policies
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS kdr_insert_own_authorized ON public.kpi_daily_reports;

-- Create new INSERT policy that allows any authorized user to insert data
-- Users can insert data for brands they have access to (not just their own user_id)
CREATE POLICY kdr_insert_own_authorized ON public.kpi_daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS kdr_update_own ON public.kpi_daily_reports;

-- Create new UPDATE policy that allows any authorized user to update data
-- Users can update data for brands they have access to (not just their own user_id)
CREATE POLICY kdr_update_own ON public.kpi_daily_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS kdr_delete_own ON public.kpi_daily_reports;

-- Create new DELETE policy that allows any authorized user to delete data
-- Users can delete data for brands they have access to (not just their own user_id)
CREATE POLICY kdr_delete_own ON public.kpi_daily_reports
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

-- ============================================
-- kpi_reports (Monthly Reports) Policies
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS kpi_reports_insert_policy ON public.kpi_reports;

-- Create new INSERT policy that allows any authorized user to insert data
CREATE POLICY kpi_reports_insert_policy ON public.kpi_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS kpi_reports_update_policy ON public.kpi_reports;

-- Create new UPDATE policy that allows any authorized user to update data
CREATE POLICY kpi_reports_update_policy ON public.kpi_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS kpi_reports_delete_policy ON public.kpi_reports;

-- Create new DELETE policy that allows any authorized user to delete data
CREATE POLICY kpi_reports_delete_policy ON public.kpi_reports
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

COMMIT;

