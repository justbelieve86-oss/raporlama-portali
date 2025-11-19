-- Ensure pgcrypto extension for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null check (status in ('aktif','pasif','kayitli')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.brands enable row level security;

-- Okuma için tüm authenticated kullanıcılara izin
DROP POLICY IF EXISTS "brands read" ON public.brands;
create policy "brands read" on public.brands for select
  to authenticated using (true);