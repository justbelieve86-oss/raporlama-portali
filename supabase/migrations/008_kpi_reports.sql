-- Monthly KPI values per user and brand
create table if not exists public.kpi_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  year integer not null check (year >= 2000 and year <= 2100),
  month integer not null check (month >= 1 and month <= 12),
  value numeric(18,2) not null default 0,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null,
  primary key (user_id, brand_id, kpi_id, year, month)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists kpi_reports_set_updated_at on public.kpi_reports;
create trigger kpi_reports_set_updated_at
before update on public.kpi_reports
for each row execute function public.set_updated_at();

alter table public.kpi_reports enable row level security;

do $$
begin
  -- Read own rows
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_reports' and policyname = 'kpi_reports_select_own'
  ) then
    create policy kpi_reports_select_own on public.kpi_reports
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  -- Insert only for own rows and authorized brand
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_reports' and policyname = 'kpi_reports_insert_own_authorized'
  ) then
    create policy kpi_reports_insert_own_authorized on public.kpi_reports
      for insert to authenticated
      with check (
        auth.uid() = user_id and exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;

  -- Update own rows
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_reports' and policyname = 'kpi_reports_update_own'
  ) then
    create policy kpi_reports_update_own on public.kpi_reports
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Delete own rows (optional)
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'kpi_reports' and policyname = 'kpi_reports_delete_own'
  ) then
    create policy kpi_reports_delete_own on public.kpi_reports
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;