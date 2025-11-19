-- Remove the role constraint from profiles table to support dynamic roles
alter table public.profiles drop constraint if exists profiles_role_check;

-- Add a more flexible constraint that allows any non-empty text
alter table public.profiles add constraint profiles_role_check check (role is not null and length(trim(role)) > 0);