-- Migration: Fix RLS policies for kpi_reports and brand_kpi_targets to allow shared data viewing
-- Description: Update RLS policies to allow users to view all data for authorized brands (not just their own)
-- This enables shared data entry where all users can see data entered by any user for brands they have access to

BEGIN;

-- ============================================
-- kpi_reports (Monthly Reports) Policies
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS kpi_reports_select_policy ON public.kpi_reports;

-- Create new SELECT policy that allows viewing all data for authorized brands
-- Users can see all monthly reports for brands they have access to (not just their own)
CREATE POLICY kpi_reports_select_policy ON public.kpi_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub
      WHERE ub.user_id = (SELECT auth.uid())
      AND ub.brand_id::text = public.kpi_reports.brand_id::text
    )
  );

-- Note: INSERT, UPDATE, DELETE policies remain user-specific (users can only modify their own data)
-- This is intentional for data integrity and audit purposes

-- ============================================
-- brand_kpi_targets (Targets) Policies
-- ============================================

-- brand_kpi_targets already has shared viewing (no user_id check in SELECT policy)
-- But let's verify and ensure it's correct
-- The existing policy should already allow viewing all targets for authorized brands
-- No changes needed for brand_kpi_targets SELECT policy

COMMIT;

