-- Adapté de supabase/docker/volumes/db/roles.sql : la pile Petit Pont n'embarque ni Edge Functions
-- (webhooks.sql) ni Storage côté API, certains rôles peuvent donc ne pas exister.
-- On fixe le mot de passe de chaque rôle de service présent.
\set pgpass `echo "$POSTGRES_PASSWORD"`
select set_config('petit_pont.pgpass', :'pgpass', false);

do $$
declare
  r text;
begin
  foreach r in array array['authenticator', 'pgbouncer', 'supabase_auth_admin', 'supabase_functions_admin', 'supabase_storage_admin']
  loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('alter user %I with password %L', r, current_setting('petit_pont.pgpass'));
    end if;
  end loop;
end;
$$;

select set_config('petit_pont.pgpass', '', false);
