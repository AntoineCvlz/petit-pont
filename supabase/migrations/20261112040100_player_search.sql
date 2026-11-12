-- Recherche de joueurs insensible aux accents et à la casse (nom affiché + prénom + nom)
create extension if not exists pg_trgm with schema extensions;

alter table public.players add column search_text text not null default '';

create function public.players_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := lower(extensions.unaccent('extensions.unaccent'::regdictionary,
    concat_ws(' ', new.display_name, new.first_name, new.last_name)));
  return new;
end;
$$;

create trigger players_search_text
  before insert or update of display_name, first_name, last_name on public.players
  for each row execute function public.players_search_text();

update public.players set display_name = display_name; -- remplit les lignes existantes

create index players_search_text_idx on public.players using gin (search_text extensions.gin_trgm_ops);
