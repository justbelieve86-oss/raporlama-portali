-- Create user_brand_kpis join table to track which KPIs a user manages per brand
create table if not exists public.user_brand_kpis (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  primary key (user_id, brand_id, kpi_id)
);

alter table public.user_brand_kpis enable row level security;

-- Allow authenticated users to read only their own mappings
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'user_brand_kpis' and policyname = 'ubk_select_own'
  ) then
    create policy ubk_select_own on public.user_brand_kpis
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  -- Allow insert if the row belongs to the user and the brand is authorized for that user
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'user_brand_kpis' and policyname = 'ubk_insert_authorized'
  ) then
    create policy ubk_insert_authorized on public.user_brand_kpis
      for insert to authenticated
      with check (
        auth.uid() = user_id 
        and exists (
          select 1 from public.user_brands ub
          where ub.user_id = auth.uid() and ub.brand_id = brand_id
        )
      );
  end if;

  -- Allow delete only for own rows (optional)
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'user_brand_kpis' and policyname = 'ubk_delete_own'
  ) then
    create policy ubk_delete_own on public.user_brand_kpis
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;