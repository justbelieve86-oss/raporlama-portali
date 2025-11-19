-- Create a function to find a user's email by their username.
-- This function is SECURITY DEFINER, so it runs with the permissions of the user that created it (the postgres user).
-- The postgres user has the necessary permissions to read the auth.users table.
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE raw_user_meta_data->>'username' = p_username;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the authenticated and anon roles so that the backend can call this function.
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated, service_role;