-- Pin function search_path to satisfy linter: function_search_path_mutable
-- Functions: public.list_rls_policies, public.get_email_by_username, public.get_all_users

BEGIN;

-- 1) public.list_rls_policies: pin to pg_catalog for system catalogs
CREATE OR REPLACE FUNCTION public.list_rls_policies(table_name text)
RETURNS TABLE (
  policyname text,
  permissive text,
  roles text,
  cmd text,
  qual text,
  with_check text
)
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.polname::text,
    p.polpermissive::text,
    array_to_string(p.polroles::regrole[]::text[], ', ')::text,
    p.polcmd::text,
    p.polqual::text,
    p.polwithcheck::text
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = table_name;
END;
$$;

-- 2) public.get_email_by_username: pin search_path and keep SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE raw_user_meta_data->>'username' = p_username;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated, service_role;

-- 3) public.get_all_users: pin search_path, keep STABLE and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_all_users(
  search_query text DEFAULT NULL,
  role_filter text DEFAULT NULL,
  sort_column text DEFAULT 'created_at',
  sort_direction text DEFAULT 'desc',
  offset_val integer DEFAULT 0,
  limit_val integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  user_metadata jsonb,
  role text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_users AS (
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      u.raw_user_meta_data AS user_metadata,
      COALESCE(p.role, 'user') AS role
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE 
      (search_query IS NULL OR 
       u.email ILIKE '%' || search_query || '%' OR
       u.raw_user_meta_data->>'username' ILIKE '%' || search_query || '%' OR
       u.raw_user_meta_data->>'full_name' ILIKE '%' || search_query || '%')
      AND (role_filter IS NULL OR COALESCE(p.role, 'user') = role_filter)
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM filtered_users
  )
  SELECT 
    fu.id,
    fu.email,
    fu.created_at,
    fu.last_sign_in_at,
    fu.user_metadata,
    fu.role,
    (SELECT cnt FROM total) AS total_count
  FROM filtered_users fu
  ORDER BY 
    CASE WHEN sort_direction = 'asc' THEN
      CASE sort_column
        WHEN 'email' THEN fu.email
        WHEN 'role' THEN fu.role
        WHEN 'created_at' THEN fu.created_at::text
        ELSE fu.created_at::text
      END
    END ASC,
    CASE WHEN sort_direction = 'desc' THEN
      CASE sort_column
        WHEN 'email' THEN fu.email
        WHEN 'role' THEN fu.role
        WHEN 'created_at' THEN fu.created_at::text
        ELSE fu.created_at::text
      END
    END DESC
  OFFSET offset_val
  LIMIT limit_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users(text, text, text, text, integer, integer) TO "authenticated";

COMMIT;