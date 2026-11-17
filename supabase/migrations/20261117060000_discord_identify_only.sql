-- =============================================================================
-- Connexion Discord sans accès à l'e-mail (décision du porteur du projet, nov. 2026).
-- Le serveur d'authentification (GoTrue) impose le scope « email » pour Discord : l'OAuth Discord est donc mené
-- par l'application elle-même (scope « identify » : identifiant, nom, avatar), puis la session Supabase est ouverte
-- côté serveur. Ces deux fonctions ne sont appelables qu'avec la clé de service (route de retour Discord).
-- =============================================================================

-- Compte lié à un identifiant Discord : ancienne identité OAuth (GoTrue) ou compte créé par la nouvelle connexion
create function public.discord_account(p_discord_id text)
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text
  from auth.users u
  where p_discord_id ~ '^[0-9]{5,25}$'
    and (u.raw_app_meta_data ->> 'discord_id' = p_discord_id
         or exists (select 1 from auth.identities i
                    where i.user_id = u.id and i.provider = 'discord' and i.provider_id = p_discord_id))
  order by u.created_at
  limit 1;
$$;

-- Avatar Discord à jour à chaque connexion (même validation que pour l'ancienne connexion)
create function public.discord_sync_avatar(p_user uuid, p_avatar_url text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles
  set avatar_url = public._discord_avatar(p_avatar_url)
  where id = p_user and avatar_url is distinct from public._discord_avatar(p_avatar_url);
$$;

revoke execute on function public.discord_account(text) from public, anon, authenticated;
revoke execute on function public.discord_sync_avatar(uuid, text) from public, anon, authenticated;
grant execute on function public.discord_account(text) to service_role;
grant execute on function public.discord_sync_avatar(uuid, text) to service_role;

-- E-mails Discord déjà stockés (anciennes connexions) : remplacés par l'adresse technique et retirés des métadonnées
update auth.users u
set email = 'discord-' || i.provider_id || '@users.petit-pont.invalid',
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) - 'email' - 'email_verified',
    raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('discord_id', i.provider_id)
from auth.identities i
where i.user_id = u.id and i.provider = 'discord' and i.provider_id ~ '^[0-9]{5,25}$'
  and u.email is distinct from 'discord-' || i.provider_id || '@users.petit-pont.invalid';

update auth.identities
set identity_data = identity_data - 'email' - 'email_verified'
where provider = 'discord' and (identity_data ? 'email' or identity_data ? 'email_verified');
