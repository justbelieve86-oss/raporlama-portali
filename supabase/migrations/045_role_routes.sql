-- Role-based Route Access Control
-- Creates table to persist role-specific route access (role_name → route_path)

BEGIN;

-- Table: role_routes
CREATE TABLE IF NOT EXISTS public.role_routes (
  role_name text NOT NULL,
  route_path text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_name, route_path)
);

CREATE INDEX IF NOT EXISTS idx_role_routes_role ON public.role_routes(role_name);
CREATE INDEX IF NOT EXISTS idx_role_routes_route ON public.role_routes(route_path);

ALTER TABLE public.role_routes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Allow authenticated users to read role routes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'role_routes' AND policyname = 'role_routes_select_authenticated'
  ) THEN
    CREATE POLICY role_routes_select_authenticated ON public.role_routes
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- Only admins can modify role routes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'role_routes' AND policyname = 'role_routes_modify_admin'
  ) THEN
    CREATE POLICY role_routes_modify_admin ON public.role_routes
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
        )
      );
  END IF;
END$$;

COMMENT ON TABLE public.role_routes IS 'Stores allowed route_path for each role_name. Enables role-specific page access control.';

COMMIT;

