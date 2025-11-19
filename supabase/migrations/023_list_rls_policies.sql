create or replace function list_rls_policies(table_name text)
returns table (
  policyname text,
  permissive text,
  roles text,
  cmd text,
  qual text,
  with_check text
) as $$
begin
  return query
  select
    p.polname::text,
    p.polpermissive::text,
    array_to_string(p.polroles::regrole[]::text[], ', ')::text,
    p.polcmd::text,
    p.polqual::text,
    p.polwithcheck::text
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = table_name;
end;
$$ language plpgsql;