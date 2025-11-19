-- Drop the old view if it exists
DROP VIEW IF EXISTS public.user_details;

-- Recreate the view with SECURITY DEFINER
CREATE VIEW public.user_details
WITH (security_invoker = false) -- Use SECURITY DEFINER behavior
AS
SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    p.role,
    u.raw_user_meta_data->>'full_name' AS full_name,
    u.raw_user_meta_data->>'username' AS username,
    (
        SELECT json_agg(json_build_object('id', b.id, 'name', b.name))
        FROM user_brands ub
        JOIN brands b ON ub.brand_id = b.id
        WHERE ub.user_id = u.id
    ) as brands
FROM
    auth.users u
LEFT JOIN
    public.profiles p ON u.id = p.id;

-- Grant permissions on the new view
GRANT SELECT ON TABLE public.user_details TO authenticated;