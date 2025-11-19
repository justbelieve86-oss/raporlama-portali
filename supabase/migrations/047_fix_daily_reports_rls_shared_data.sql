-- Migration: Fix RLS policy for kpi_daily_reports to allow shared data viewing
-- Description: Update RLS policy to allow users to view all data for authorized brands (not just their own)
-- This enables shared data entry where all users can see data entered by any user for brands they have access to

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS kdr_select_own_authorized ON public.kpi_daily_reports;

-- Create new SELECT policy that allows viewing all data for authorized brands
-- Users can see all daily reports for brands they have access to (not just their own)
CREATE POLICY kdr_select_own_authorized ON public.kpi_daily_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id = public.kpi_daily_reports.brand_id
    )
  );

COMMIT;

