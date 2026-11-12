-- =============================================================================
-- Photo de profil Discord
--
-- Source : auth.identities.identity_data (écrit par le serveur d'authentification à chaque connexion
-- Discord, non modifiable par le joueur, contrairement à user_metadata). Seules les URL du CDN
-- d'avatars Discord sont acceptées : pas d'image arbitraire ni de pixel de suivi.
-- =============================================================================

-- Les joueurs ne choisissent plus leur avatar eux-mêmes
revoke update (avatar_url) on public.profiles from authenticated;

create function public._discord_avatar(p_url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_url ~ '^https://cdn\.discordapp\.com/(avatars/[0-9]{5,25}/(a_)?[0-9a-f]{32}|embed/avatars/[0-9]{1,2})\.(png|gif|webp|jpe?g)$'
      then p_url
  end;
$$;

update public.profiles set avatar_url = null where avatar_url is not null and public._discord_avatar(avatar_url) is null;
alter table public.profiles
  add constraint profiles_avatar_discord check (avatar_url is null or public._discord_avatar(avatar_url) is not null);

create function public.sync_discord_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider = 'discord' then
    update public.profiles
    set avatar_url = public._discord_avatar(new.identity_data ->> 'avatar_url')
    where id = new.user_id
      and avatar_url is distinct from public._discord_avatar(new.identity_data ->> 'avatar_url');
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_discord_avatar() from public, anon, authenticated;

-- À la première connexion (identité créée après le profil) et à chaque reconnexion (avatar changé)
create trigger on_discord_identity_saved
  after insert or update of identity_data on auth.identities
  for each row execute function public.sync_discord_avatar();

-- Comptes Discord déjà existants
update public.profiles p
set avatar_url = public._discord_avatar(i.identity_data ->> 'avatar_url')
from auth.identities i
where i.user_id = p.id and i.provider = 'discord';
