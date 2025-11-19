-- Security hardening: Pin search_path and avoid unqualified references
-- This migration replaces trigger functions to ensure deterministic resolution
-- and mitigate search_path-based vulnerabilities flagged by advisors.

-- Recreate update_user_kpi_ordering_updated_at with pinned search_path
CREATE OR REPLACE FUNCTION public.update_user_kpi_ordering_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Use SQL-standard current timestamp to avoid schema resolution
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Recreate shared set_updated_at with pinned search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Note: existing triggers continue to reference these function names.
-- No trigger recreation required.