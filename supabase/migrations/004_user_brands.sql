-- Create user_brands join table to associate users with brands
create table if not exists public.user_brands (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  primary key (user_id, brand_id)
);

alter table public.user_brands enable row level security;

-- Allow authenticated users to read user-brand associations (adjust as needed)
DROP POLICY IF EXISTS "authenticated can read user_brands" ON public.user_brands;
create policy "authenticated can read user_brands"
  on public.user_brands
  for select
  to authenticated
  using (true);

-- Admin operations use service role; no insert/update/delete policies required here