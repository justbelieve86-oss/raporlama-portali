-- Create kpi_categories table
create table if not exists public.kpi_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Updated_at trigger (create or replace for idempotency)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.kpi_categories;
create trigger set_updated_at
before update on public.kpi_categories
for each row execute function public.set_updated_at();

-- RLS and simple auth policies
alter table public.kpi_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_categories' and policyname = 'Authenticated can select'
  ) then
    create policy "Authenticated can select" on public.kpi_categories
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_categories' and policyname = 'Authenticated can insert'
  ) then
    create policy "Authenticated can insert" on public.kpi_categories
      for insert to authenticated with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_categories' and policyname = 'Authenticated can update'
  ) then
    create policy "Authenticated can update" on public.kpi_categories
      for update to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_categories' and policyname = 'Authenticated can delete'
  ) then
    create policy "Authenticated can delete" on public.kpi_categories
      for delete to authenticated using (true);
  end if;
end $$;