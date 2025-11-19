create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

-- Basit RLS politikaları (okuma için tüm authenticated kullanıcılara izin)
DROP POLICY IF EXISTS "profiles read" ON public.profiles;
create policy "profiles read" on public.profiles for select
  to authenticated using (true);