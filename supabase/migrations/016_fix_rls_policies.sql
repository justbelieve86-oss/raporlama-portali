-- Fix RLS policies for kpi_reports and brand_kpi_targets tables
-- This migration drops existing policies and creates new, simpler ones

-- Drop existing policies for kpi_reports
DROP POLICY IF EXISTS kpi_reports_select_own ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_insert_own_authorized ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_update_own ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_delete_own ON public.kpi_reports;

-- Drop existing policies for brand_kpi_targets
DROP POLICY IF EXISTS bkt_select_authorized_brand ON public.brand_kpi_targets;
DROP POLICY IF EXISTS bkt_insert_authorized_brand ON public.brand_kpi_targets;
DROP POLICY IF EXISTS bkt_update_authorized_brand ON public.brand_kpi_targets;
DROP POLICY IF EXISTS bkt_delete_authorized_brand ON public.brand_kpi_targets;

-- Drop new policies if they exist, to make the script idempotent
DROP POLICY IF EXISTS kpi_reports_select_policy ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_insert_policy ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_update_policy ON public.kpi_reports;
DROP POLICY IF EXISTS kpi_reports_delete_policy ON public.kpi_reports;
DROP POLICY IF EXISTS brand_kpi_targets_select_policy ON public.brand_kpi_targets;
DROP POLICY IF EXISTS brand_kpi_targets_insert_policy ON public.brand_kpi_targets;
DROP POLICY IF EXISTS brand_kpi_targets_update_policy ON public.brand_kpi_targets;
DROP POLICY IF EXISTS brand_kpi_targets_delete_policy ON public.brand_kpi_targets;

-- Create new simplified policies for kpi_reports
-- Allow users to select their own data for authorized brands
CREATE POLICY kpi_reports_select_policy ON public.kpi_reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = kpi_reports.brand_id::text
    )
  );

-- Allow users to insert data for authorized brands
CREATE POLICY kpi_reports_insert_policy ON public.kpi_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = kpi_reports.brand_id::text
    )
  );

-- Allow users to update their own data for authorized brands
CREATE POLICY kpi_reports_update_policy ON public.kpi_reports
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = kpi_reports.brand_id::text
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = kpi_reports.brand_id::text
    )
  );

-- Allow users to delete their own data for authorized brands
CREATE POLICY kpi_reports_delete_policy ON public.kpi_reports
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = kpi_reports.brand_id::text
    )
  );

-- Create new simplified policies for brand_kpi_targets
-- Allow users to select targets for authorized brands
CREATE POLICY brand_kpi_targets_select_policy ON public.brand_kpi_targets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = brand_kpi_targets.brand_id::text
    )
  );

-- Allow users to insert targets for authorized brands
CREATE POLICY brand_kpi_targets_insert_policy ON public.brand_kpi_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = brand_kpi_targets.brand_id::text
    )
  );

-- Allow users to update targets for authorized brands
CREATE POLICY brand_kpi_targets_update_policy ON public.brand_kpi_targets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = brand_kpi_targets.brand_id::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = brand_kpi_targets.brand_id::text
    )
  );

-- Allow users to delete targets for authorized brands
CREATE POLICY brand_kpi_targets_delete_policy ON public.brand_kpi_targets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brands ub 
      WHERE ub.user_id = auth.uid() 
      AND ub.brand_id::text = brand_kpi_targets.brand_id::text
    )
  );