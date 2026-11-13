-- =============================================================================
-- Discord : annonces automatiques dans un salon (webhook) pour les moments forts du jeu
-- (grosses ouvertures, albums complétés, grosses ventes, vainqueurs de ligue, objectifs de clan).
-- L'URL du webhook est un secret : table sans aucune politique RLS (illisible via l'API),
-- modifiable uniquement par un admin via RPC. Envoi asynchrone par pg_net (n'échoue jamais une action de jeu).
-- =============================================================================

create extension if not exists pg_net;

create table public.private_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.private_settings enable row level security;
revoke all on public.private_settings from anon, authenticated;

create function public.admin_set_discord_webhook(p_url text, p_site_url text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if p_site_url is not null then
    if btrim(p_site_url) !~ '^https?://[A-Za-z0-9.:-]+$' then
      raise exception 'URL du site invalide (ex. https://petit-pont.example.fr)' using errcode = 'P0001';
    end if;
    update public.app_settings set value = to_jsonb(btrim(p_site_url)) where key = 'site_url';
  end if;
  if p_url is null or btrim(p_url) = '' then
    delete from public.private_settings where key = 'discord_webhook';
    return;
  end if;
  if btrim(p_url) !~ '^https://(discord|discordapp)\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$' then
    raise exception 'URL de webhook Discord invalide' using errcode = 'P0001';
  end if;
  insert into public.private_settings (key, value) values ('discord_webhook', btrim(p_url))
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

create function public.admin_discord_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_admin() then jsonb_build_object(
    'configured', exists (select 1 from public.private_settings where key = 'discord_webhook'),
    'updated_at', (select updated_at from public.private_settings where key = 'discord_webhook'),
    'site_url', public.get_setting('site_url') #>> '{}')
  end;
$$;

-- Envoi d'une annonce (embed Discord). Silencieux si aucun webhook n'est configuré.
create function public._discord_announce(p_title text, p_description text, p_color int, p_thumbnail text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_site text := coalesce(public.get_setting('site_url') #>> '{}', '');
  v_embed jsonb;
begin
  select value into v_url from public.private_settings where key = 'discord_webhook';
  if v_url is null then
    return;
  end if;
  v_embed := jsonb_build_object('title', left(p_title, 250), 'description', left(coalesce(p_description, ''), 2000), 'color', p_color);
  if p_thumbnail is not null and v_site <> '' then
    v_embed := v_embed || jsonb_build_object('thumbnail', jsonb_build_object('url', v_site || p_thumbnail));
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('username', 'Petit Pont', 'embeds', jsonb_build_array(v_embed)),
    headers := '{"Content-Type": "application/json"}'::jsonb);
exception when others then
  -- Une annonce ratée ne doit jamais bloquer le jeu
  null;
end;
$$;

-- URL publique du site (vignettes des annonces)
insert into public.app_settings (key, value, description) values
  ('site_url', '""', 'URL publique du site (ex. https://petit-pont.example.fr), pour les images des annonces Discord')
on conflict (key) do nothing;

create function public._discord_on_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := (select username from public.profiles where id = new.user_id);
  v_player text;
  v_image text;
  v_rarity text;
begin
  if new.template_id is not null then
    select p.display_name, coalesce(ct.image_url, p.image_url), ct.rarity::text into v_player, v_image, v_rarity
    from public.card_templates ct join public.players p on p.id = ct.player_id where ct.id = new.template_id;
  end if;
  case new.type
    when 'rare_pull' then
      perform public._discord_announce(
        v_user || ' a tiré ' || v_player || ' !',
        initcap(coalesce(new.payload ->> 'rarity', v_rarity)) || ' n°' || coalesce(new.payload ->> 'serial_number', '?')
          || coalesce(' · ' || (new.payload ->> 'booster'), ''),
        case coalesce(new.payload ->> 'rarity', v_rarity) when 'speciale' then 5832650 when 'iconique' then 15025000 else 15905600 end,
        v_image);
    when 'album_completed' then
      perform public._discord_announce(v_user || ' a complété un album !',
        coalesce((select name from public.albums where id = new.album_id), 'Album'), 9425258);
    when 'big_sale' then
      perform public._discord_announce('Grosse vente au marché',
        v_user || ' a vendu ' || coalesce(v_player, 'une carte') || coalesce(' pour ' || (new.payload ->> 'price') || ' pièces', ''),
        16040523, v_image);
    else
      null;
  end case;
  return new;
end;
$$;
create trigger discord_announce after insert on public.activity_feed
  for each row execute function public._discord_on_activity();

create function public._discord_on_league()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'finished' and new.status = 'finished' and new.winner_id is not null then
    perform public._discord_announce('Ligue « ' || new.name || ' » terminée',
      (select username from public.profiles where id = new.winner_id) || ' remporte le titre !', 9425258);
  end if;
  return new;
end;
$$;
create trigger discord_announce after update of status on public.private_leagues
  for each row execute function public._discord_on_league();

create function public._discord_on_clan_goal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    perform public._discord_announce(
      (select '[' || tag || '] ' || name from public.clans where id = new.clan_id) || ' a atteint son objectif de la semaine',
      new.title || ' : ' || new.target || '/' || new.target, 5832650);
  end if;
  return new;
end;
$$;
create trigger discord_announce after update of completed_at on public.clan_goals
  for each row execute function public._discord_on_clan_goal();

revoke execute on function public._discord_announce(text, text, int, text) from public, anon, authenticated;
revoke execute on function public._discord_on_activity() from public, anon, authenticated;
revoke execute on function public._discord_on_league() from public, anon, authenticated;
revoke execute on function public._discord_on_clan_goal() from public, anon, authenticated;
revoke execute on function public.admin_set_discord_webhook(text, text) from public, anon;
revoke execute on function public.admin_discord_status() from public, anon;
grant execute on function public.admin_set_discord_webhook(text, text) to authenticated;
grant execute on function public.admin_discord_status() to authenticated;
