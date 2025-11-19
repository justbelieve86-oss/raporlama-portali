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
end $$;