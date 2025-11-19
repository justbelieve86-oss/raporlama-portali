-- Brand/year scoped KPI targets per brand and KPI
create table if not exists public.brand_kpi_targets (
  brand_id uuid not null references public.brands(id) on delete cascade,
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  year integer not null check (year >= 2000 and year <= 2100),
  target numeric(18,2) not null default 0,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null,
  primary key (brand_id, kpi_id, year)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists brand_kpi_targets_set_updated_at on public.brand_kpi_targets;
create trigger brand_kpi_targets_set_updated_at
before update on public.brand_kpi_targets
for each row execute function public.set_updated_at();

alter table public.brand_kpi_targets enable row level security;

do $$
begin
  -- Allow authenticated users to read targets only for brands they are authorized for
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_kpi_targets' and policyname = 'bkt_select_authorized_brand'
  ) then
    create policy bkt_select_authorized_brand on public.brand_kpi_targets
      for select to authenticated
      using (
        exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;

  -- Allow insert for authorized brands
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_kpi_targets' and policyname = 'bkt_insert_authorized_brand'
  ) then
    create policy bkt_insert_authorized_brand on public.brand_kpi_targets
      for insert to authenticated
      with check (
        exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;

  -- Allow update for authorized brands
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_kpi_targets' and policyname = 'bkt_update_authorized_brand'
  ) then
    create policy bkt_update_authorized_brand on public.brand_kpi_targets
      for update to authenticated
      using (
        exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      )
      with check (
        exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;

  -- Allow delete for authorized brands (optional)
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_kpi_targets' and policyname = 'bkt_delete_authorized_brand'
  ) then
    create policy bkt_delete_authorized_brand on public.brand_kpi_targets
      for delete to authenticated
      using (
        exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;
end $$;-- Migration: User KPI Ordering Preferences
-- Description: Create table to store user-specific KPI ordering preferences

-- Create user_kpi_ordering table
CREATE TABLE IF NOT EXISTS user_kpi_ordering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique ordering per user and brand
    UNIQUE(user_id, brand_id, kpi_id),
    UNIQUE(user_id, brand_id, order_index)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_kpi_ordering_user_brand ON user_kpi_ordering(user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_user_kpi_ordering_order ON user_kpi_ordering(user_id, brand_id, order_index);

-- Enable RLS (Row Level Security)
ALTER TABLE user_kpi_ordering ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own ordering preferences
DROP POLICY IF EXISTS "Users can view their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can view their own KPI ordering" ON user_kpi_ordering
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can insert their own KPI ordering" ON user_kpi_ordering
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can update their own KPI ordering" ON user_kpi_ordering
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can delete their own KPI ordering" ON user_kpi_ordering
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_kpi_ordering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (drop if exists first to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_update_user_kpi_ordering_updated_at ON user_kpi_ordering;
CREATE TRIGGER trigger_update_user_kpi_ordering_updated_at
    BEFORE UPDATE ON user_kpi_ordering
    FOR EACH ROW
    EXECUTE FUNCTION update_user_kpi_ordering_updated_at();

-- Grant necessary permissions
GRANT ALL ON user_kpi_ordering TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;-- Create kpi_units table
create table if not exists public.kpi_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Updated_at trigger (reuse existing function)
drop trigger if exists set_updated_at on public.kpi_units;
create trigger set_updated_at
before update on public.kpi_units
for each row execute function public.set_updated_at();

-- RLS and simple auth policies
alter table public.kpi_units enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_units' and policyname = 'Authenticated can select'
  ) then
    create policy "Authenticated can select" on public.kpi_units
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_units' and policyname = 'Authenticated can insert'
  ) then
    create policy "Authenticated can insert" on public.kpi_units
      for insert to authenticated with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_units' and policyname = 'Authenticated can update'
  ) then
    create policy "Authenticated can update" on public.kpi_units
      for update to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_units' and policyname = 'Authenticated can delete'
  ) then
    create policy "Authenticated can delete" on public.kpi_units
      for delete to authenticated using (true);
  end if;
end $$;

-- Insert default units
insert into public.kpi_units (name) values 
  ('Puan'),
  ('Adet'),
  ('%')
on conflict (name) do nothing;-- Add source KPI references for percentage-based calculations

-- Add columns for percentage calculation sources
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS numerator_kpi_id uuid REFERENCES public.kpis(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS denominator_kpi_id uuid REFERENCES public.kpis(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS calculation_type text CHECK (calculation_type IN ('direct', 'percentage')) DEFAULT 'direct';

-- Add comment to explain the new columns
COMMENT ON COLUMN public.kpis.numerator_kpi_id IS 'For percentage KPIs: the KPI used as numerator in the calculation';
COMMENT ON COLUMN public.kpis.denominator_kpi_id IS 'For percentage KPIs: the KPI used as denominator in the calculation';
COMMENT ON COLUMN public.kpis.calculation_type IS 'Type of calculation: direct (normal KPI) or percentage (calculated from other KPIs)';

-- Update existing KPIs to have 'direct' calculation type
UPDATE public.kpis SET calculation_type = 'direct' WHERE calculation_type IS NULL;-- Add projection field to KPIs table

-- Add projection column for yearly target projection
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS projection numeric;

-- Add comment to explain the projection column
COMMENT ON COLUMN public.kpis.projection IS 'Yearly target projection value for the KPI';-- Remove the role constraint from profiles table to support dynamic roles
alter table public.profiles drop constraint if exists profiles_role_check;

-- Add a more flexible constraint that allows any non-empty text
alter table public.profiles add constraint profiles_role_check check (role is not null and length(trim(role)) > 0);-- Fix RLS policies for kpi_reports and brand_kpi_targets tables
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
  );-- Daily KPI values per user, brand, KPI, and calendar day
create table if not exists public.kpi_daily_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  year integer not null check (year >= 2000 and year <= 2100),
  month integer not null check (month >= 1 and month <= 12),
  day integer not null check (day >= 1 and day <= 31),
  value numeric(18,2) not null default 0,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null,
  primary key (user_id, brand_id, kpi_id, year, month, day)
);

-- Reuse common updated_at trigger function if exists; otherwise create
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists kpi_daily_reports_set_updated_at on public.kpi_daily_reports;
create trigger kpi_daily_reports_set_updated_at
before update on public.kpi_daily_reports
for each row execute function public.set_updated_at();

alter table public.kpi_daily_reports enable row level security;

do $$
begin
  -- Allow authenticated users to read their own rows for authorized brands
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_daily_reports' and policyname = 'kdr_select_own_authorized'
  ) then
    create policy kdr_select_own_authorized on public.kpi_daily_reports
      for select to authenticated
      using (
        auth.uid() = user_id and exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;

  -- Insert only own rows for authorized brands
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_daily_reports' and policyname = 'kdr_insert_own_authorized'
  ) then
    create policy kdr_insert_own_authorized on public.kpi_daily_reports
      for insert to authenticated
      with check (
        auth.uid() = user_id and exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;

  -- Update only own rows
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_daily_reports' and policyname = 'kdr_update_own'
  ) then
    create policy kdr_update_own on public.kpi_daily_reports
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Delete only own rows (optional)
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_daily_reports' and policyname = 'kdr_delete_own'
  ) then
    create policy kdr_delete_own on public.kpi_daily_reports
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;-- Add cumulative KPI support: relation table and calculation_type extension

-- Create table to store cumulative source relations (many-to-many)
CREATE TABLE IF NOT EXISTS public.kpi_cumulative_sources (
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  source_kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kpi_id, source_kpi_id)
);

ALTER TABLE public.kpi_cumulative_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpi_cumulative_sources' AND policyname = 'kpi_cumulative_sources_select'
  ) THEN
    CREATE POLICY kpi_cumulative_sources_select ON public.kpi_cumulative_sources
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpi_cumulative_sources' AND policyname = 'kpi_cumulative_sources_insert'
  ) THEN
    CREATE POLICY kpi_cumulative_sources_insert ON public.kpi_cumulative_sources
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpi_cumulative_sources' AND policyname = 'kpi_cumulative_sources_delete'
  ) THEN
    CREATE POLICY kpi_cumulative_sources_delete ON public.kpi_cumulative_sources
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Extend calculation_type to include 'cumulative'
DO $$
BEGIN
  -- Try to drop the existing autogenerated check constraint if present
  BEGIN
    ALTER TABLE public.kpis DROP CONSTRAINT IF EXISTS kpis_calculation_type_check;
  EXCEPTION WHEN undefined_object THEN
    -- ignore if constraint name differs
    NULL;
  END;

  ALTER TABLE public.kpis ADD CONSTRAINT kpis_calculation_type_check CHECK (
    calculation_type IN ('direct', 'percentage', 'cumulative')
  );
END $$;

COMMENT ON COLUMN public.kpis.calculation_type IS 'Type of calculation: direct (manual), percentage (numerator/denominator), cumulative (sum of source KPIs)';-- Add formula KPI support: expression table and calculation_type extension

-- Table to store formula expressions per KPI (referencing other KPIs via ID tokens)
CREATE TABLE IF NOT EXISTS public.kpi_formulas (
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  expression text NOT NULL, -- normalized expression using KPI ID tokens, e.g., {{<uuid>}} + {{<uuid>}} - ...
  display_expression text,  -- optional human-readable expression with KPI names (for UI)
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kpi_id)
);

ALTER TABLE public.kpi_formulas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpi_formulas' AND policyname = 'kpi_formulas_select'
  ) THEN
    CREATE POLICY kpi_formulas_select ON public.kpi_formulas
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpi_formulas' AND policyname = 'kpi_formulas_insert'
  ) THEN
    CREATE POLICY kpi_formulas_insert ON public.kpi_formulas
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kpi_formulas' AND policyname = 'kpi_formulas_delete'
  ) THEN
    CREATE POLICY kpi_formulas_delete ON public.kpi_formulas
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Extend calculation_type to include 'formula'
DO $$
BEGIN
  -- Try to drop the existing autogenerated check constraint if present
  BEGIN
    ALTER TABLE public.kpis DROP CONSTRAINT IF EXISTS kpis_calculation_type_check;
  EXCEPTION WHEN undefined_object THEN
    -- ignore if constraint name differs
    NULL;
  END;

  ALTER TABLE public.kpis ADD CONSTRAINT kpis_calculation_type_check CHECK (
    calculation_type IN ('direct', 'percentage', 'cumulative', 'formula')
  );
END $$;

COMMENT ON COLUMN public.kpis.calculation_type IS 'Type of calculation: direct (manual), percentage (numerator/denominator), cumulative (sum), formula (expression of other KPIs)';