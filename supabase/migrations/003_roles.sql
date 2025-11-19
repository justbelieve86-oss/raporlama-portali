-- Ensure pgcrypto extension for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null check (status in ('aktif','pasif')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.roles enable row level security;

-- Okuma için tüm authenticated kullanıcılara izin
DROP POLICY IF EXISTS "roles read" ON public.roles;
create policy "roles read" on public.roles for select
  to authenticated using (true);