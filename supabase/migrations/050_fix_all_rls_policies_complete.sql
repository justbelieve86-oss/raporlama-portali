-- Migration: Complete fix for all RLS policies to enable shared data viewing and editing
-- Description: This migration ensures all users can view and edit data for brands they have access to
-- This is a comprehensive fix that replaces any existing policies

BEGIN;

-- ============================================
-- kpi_daily_reports (Daily Reports) Policies
-- ============================================

-- Drop ALL existing policies for kpi_daily_reports
DROP POLICY IF EXISTS kdr_select_own_authorized ON public.kpi_daily_reports;
DROP POLICY IF EXISTS kdr_insert_own_authorized ON public.kpi_daily_reports;
DROP POLICY IF EXISTS kdr_update_own ON public.kpi_daily_reports;
DROP POLICY IF EXISTS kdr_delete_own ON public.kpi_daily_reports;

-- SELECT: All authorized users can view all data for brands they have access to
CREATE POLICY kdr_select_own_authorized ON public.kpi_daily_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

-- INSERT: All authorized users can insert data for brands they have access to
CREATE POLICY kdr_insert_own_authorized ON public.kpi_daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

-- UPDATE: All authorized users can update data for brands they have access to
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

-- DELETE: All authorized users can delete data for brands they have access to
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

-- Drop ALL existing policies for kpi_reports
DROP POLICY IF EXISTS kpi_reports_select_policy ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_insert_policy ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_update_policy ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_delete_policy ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_select_own ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_insert_own_authorized ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_update_own ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_delete_own ON public.kpi_reports;

-- SELECT: All authorized users can view all data for brands they have access to
CREATE POLICY kpi_reports_select_policy ON public.kpi_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

-- INSERT: All authorized users can insert data for brands they have access to
CREATE POLICY kpi_reports_insert_policy ON public.kpi_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

-- UPDATE: All authorized users can update data for brands they have access to
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

-- DELETE: All authorized users can delete data for brands they have access to
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

