-- Access Control Persistence
-- Creates tables to persist route access matrix and role→category mapping

-- Table: role_categories
CREATE TABLE IF NOT EXISTS public.role_categories (
  role_name text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('admin','manager','user')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.role_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Allow authenticated users to read role categories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'role_categories' AND policyname = 'role_categories_select_authenticated'
  ) THEN
    CREATE POLICY role_categories_select_authenticated ON public.role_categories
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- Only admins can modify role categories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'role_categories' AND policyname = 'role_categories_modify_admin'
  ) THEN
    CREATE POLICY role_categories_modify_admin ON public.role_categories
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

-- Table: access_matrix
CREATE TABLE IF NOT EXISTS public.access_matrix (
  route_path text NOT NULL,
  category text NOT NULL CHECK (category IN ('admin','manager','user')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (route_path, category)
);

CREATE INDEX IF NOT EXISTS idx_access_matrix_route ON public.access_matrix(route_path);

ALTER TABLE public.access_matrix ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Allow authenticated users to read the access matrix
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'access_matrix' AND policyname = 'access_matrix_select_authenticated'
  ) THEN
    CREATE POLICY access_matrix_select_authenticated ON public.access_matrix
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- Only admins can modify the access matrix
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'access_matrix' AND policyname = 'access_matrix_modify_admin'
  ) THEN
    CREATE POLICY access_matrix_modify_admin ON public.access_matrix
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

COMMENT ON TABLE public.role_categories IS 'Maps role names to base categories (admin/manager/user).';
COMMENT ON TABLE public.access_matrix IS 'Stores allowed route_path + category pairs for page access.';