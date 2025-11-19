-- Fix Multiple Permissive Policies
-- Optimize RLS policies by separating SELECT from INSERT/UPDATE/DELETE operations
-- This prevents multiple permissive policies from being executed for the same role and action

BEGIN;

-- Fix role_categories policies
DO $$
BEGIN
  -- Drop the old modify_admin policy that covers ALL operations
  DROP POLICY IF EXISTS role_categories_modify_admin ON public.role_categories;
  
  -- Create separate policies for INSERT, UPDATE, DELETE (admin only)
  -- Note: PostgreSQL doesn't support FOR INSERT, UPDATE, DELETE syntax
  -- We need to create separate policies for each operation
  
  -- For INSERT (admin only)
  CREATE POLICY role_categories_insert_admin ON public.role_categories
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
      )
    );
  
  -- For UPDATE (admin only)
  CREATE POLICY role_categories_update_admin ON public.role_categories
    FOR UPDATE TO authenticated
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
  
  -- For DELETE (admin only)
  CREATE POLICY role_categories_delete_admin ON public.role_categories
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
      )
    );
END$$;

-- Fix access_matrix policies
DO $$
BEGIN
  -- Drop the old modify_admin policy that covers ALL operations
  DROP POLICY IF EXISTS access_matrix_modify_admin ON public.access_matrix;
  
  -- Create separate policies for INSERT, UPDATE, DELETE (admin only)
  -- For INSERT (admin only)
  CREATE POLICY access_matrix_insert_admin ON public.access_matrix
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
      )
    );
  
  -- For UPDATE (admin only)
  CREATE POLICY access_matrix_update_admin ON public.access_matrix
    FOR UPDATE TO authenticated
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
  
  -- For DELETE (admin only)
  CREATE POLICY access_matrix_delete_admin ON public.access_matrix
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
      )
    );
END$$;

-- Fix role_routes policies
DO $$
BEGIN
  -- Drop the old modify_admin policy that covers ALL operations
  DROP POLICY IF EXISTS role_routes_modify_admin ON public.role_routes;
  
  -- Create separate policies for INSERT, UPDATE, DELETE (admin only)
  -- For INSERT (admin only)
  CREATE POLICY role_routes_insert_admin ON public.role_routes
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
      )
    );
  
  -- For UPDATE (admin only)
  CREATE POLICY role_routes_update_admin ON public.role_routes
    FOR UPDATE TO authenticated
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
  
  -- For DELETE (admin only)
  CREATE POLICY role_routes_delete_admin ON public.role_routes
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
      )
    );
END$$;

COMMIT;
