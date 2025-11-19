-- Create kpi_units table
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
on conflict (name) do nothing;