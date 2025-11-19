-- Fix function signature/types and set volatility for PostgREST RPC discovery
-- Recreate public.get_all_users with integer args and STABLE volatility

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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_all_users(text, text, text, text, integer, integer) TO "authenticated";