-- =============================================================================
-- Événements hebdomadaires (décision du porteur du projet, 18 nov. 2026)
--   - Chaque vendredi 19h (heure de Paris) : un événement à thème (Futures stars, Halloween, Noël…).
--     12 joueurs choisis selon le thème reçoivent une carte d'événement aux stats boostées (tirage limité),
--     disponibles dans un booster d'événement pendant 7 jours ; chaque joueur reçoit un pack offert.
--   - Le thème : saisonnier si on est dans sa fenêtre (Halloween, Noël…), sinon rotation (le moins récent).
--   - Planification : pg_cron toutes les 5 minutes, idempotent (un événement par créneau du vendredi).
-- L'équipe de la semaine (mercredi 19h) s'appuie sur la même mécanique (game_events, cartes boostées).
-- =============================================================================

create table public.event_themes (
  slug text primary key,
  name text not null,
  tagline text not null,
  -- Sélection des joueurs (cartes de base actives) : même grammaire que boosters.pool_rule, plus
  --   "order": "rating" | "random", "count" (12 par défaut), "min_age", "league": "random5" (un des 5 grands championnats)
  rule jsonb not null,
  boost smallint not null check (boost between 1 and 15),   -- + note et + chaque stat
  stat_bonus jsonb not null default '{}',                    -- bonus supplémentaires, ex. {"pac": 4}
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  window_start text check (window_start ~ '^[0-9]{2}-[0-9]{2}$'),  -- fenêtre saisonnière (MM-JJ), null = rotation
  window_end text check (window_end ~ '^[0-9]{2}-[0-9]{2}$'),
  sort_order smallint not null default 0
);

create table public.game_events (
  id int generated always as identity primary key,
  kind text not null check (kind in ('weekly', 'totw')),
  theme text references public.event_themes (slug),
  name text not null,
  tagline text,
  color text not null,
  slot timestamptz not null,               -- créneau (vendredi / mercredi 19h) : un seul événement par créneau
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  booster_id int references public.boosters (id),
  created_at timestamptz not null default now(),
  unique (kind, slot)
);

alter table public.event_themes enable row level security;
alter table public.game_events enable row level security;
grant select on public.event_themes, public.game_events to authenticated;
create policy "Lecture" on public.event_themes for select to authenticated using (true);
create policy "Lecture" on public.game_events for select to authenticated using (true);

-- Cartes d'événement : lien vers l'événement et stats boostées propres à la carte
alter table public.card_templates
  add column event_id int references public.game_events (id),
  add column stats jsonb;
create index card_templates_event_idx on public.card_templates (event_id) where event_id is not null;

alter table public.boosters drop constraint boosters_category_check;
alter table public.boosters add constraint boosters_category_check
  check (category in ('evenement', 'classique', 'europe', 'championnat', 'nation', 'style'));

insert into public.event_themes (slug, name, tagline, rule, boost, stat_bonus, color, window_start, window_end, sort_order) values
  ('futures-stars', 'Futures stars', 'Les meilleurs joueurs de 21 ans et moins, boostés pour la semaine.',
   '{"max_age": 21, "order": "rating"}', 6, '{"pac": 2}', '#7c5cff', null, null, 1),
  ('heros-championnat', 'Héros du championnat', 'Les cadors d''un grand championnat tiré au sort.',
   '{"league": "random5", "order": "rating"}', 4, '{}', '#2bb673', null, null, 2),
  ('murailles', 'Murailles', 'Les défenseurs les plus solides, renforcés derrière.',
   '{"position": "DEF", "order": "rating"}', 5, '{"def": 4, "phy": 3}', '#4a90d9', null, null, 3),
  ('artistes', 'Artistes', 'Les magiciens aux gestes techniques 5★.',
   '{"skill_moves_min": 5, "order": "rating"}', 5, '{"dri": 5}', '#ff4fa3', null, null, 4),
  ('renards', 'Renards des surfaces', 'Les finisseurs les plus redoutables.',
   '{"position": "ATT", "order": "rating"}', 5, '{"sho": 5}', '#e8483c', null, null, 5),
  ('veterans', 'Vétérans', 'L''expérience qui fait la différence : 33 ans et plus.',
   '{"min_age": 33, "order": "rating"}', 5, '{"pas": 3}', '#b08d57', null, null, 6),
  ('halloween', 'Halloween', 'Des cartes qui font peur aux défenses, rien que pour Halloween.',
   '{"rating_min": 76, "order": "random"}', 5, '{"pac": 4, "dri": 3}', '#ff7a1a', '10-20', '11-08', 10),
  ('noel', 'Noël', 'Le calendrier de Noël du vestiaire : des cadeaux boostés sous le sapin.',
   '{"rating_min": 78, "order": "random"}', 5, '{}', '#e23b3b', '12-01', '12-31', 11),
  ('nouvel-an', 'Nouvel an', 'Une nouvelle année, de nouvelles stars boostées.',
   '{"rating_min": 76, "order": "random"}', 4, '{}', '#f5c84c', '01-01', '01-12', 12),
  ('saint-valentin', 'Saint-Valentin', 'Les duos qui font chavirer les tribunes.',
   '{"rating_min": 76, "order": "random"}', 4, '{"pas": 4}', '#ff5f9e', '02-07', '02-16', 13);

-- Réserves de booster : nouvelle clé de règle {"event_id": n}
create or replace function public.refresh_booster_pools()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b record;
  v_total int := 0;
  v_n int;
begin
  for b in select id, pool_rule as r from public.boosters where pool_rule is not null loop
    delete from public.booster_cards where booster_id = b.id;
    insert into public.booster_cards (booster_id, template_id)
    select b.id, ct.id
    from public.card_templates ct
    join public.players p on p.id = ct.player_id
    join public.nations n on n.id = p.nation_id
    left join public.clubs c on c.id = ct.club_id
    left join public.leagues l on l.id = c.league_id
    where ct.is_active
      and (b.r ->> 'event_id' is null or ct.event_id = (b.r ->> 'event_id')::int)
      and (b.r ->> 'league' is null or l.code = b.r ->> 'league')
      and (b.r ->> 'nation' is null or n.code = b.r ->> 'nation')
      and (b.r -> 'clubs' is null or c.code in (select jsonb_array_elements_text(b.r -> 'clubs')))
      and (b.r ->> 'position' is null or p.position::text = b.r ->> 'position')
      and (b.r ->> 'skill_moves_min' is null or p.skill_moves >= (b.r ->> 'skill_moves_min')::int)
      and (b.r ->> 'weak_foot_min' is null or p.weak_foot >= (b.r ->> 'weak_foot_min')::int)
      and (b.r ->> 'rating_min' is null or ct.rating >= (b.r ->> 'rating_min')::int)
      and (b.r ->> 'rating_max' is null or ct.rating <= (b.r ->> 'rating_max')::int)
      and (b.r ->> 'max_age' is null or p.birthdate > current_date - make_interval(years => (b.r ->> 'max_age')::int + 1))
      and (b.r ->> 'stat' is null or (p.stats ->> (b.r ->> 'stat'))::int >= (b.r ->> 'stat_min')::int);
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
  end loop;
  return v_total;
end;
$$;
revoke execute on function public.refresh_booster_pools() from public, anon, authenticated;

-- Stats boostées : + boost sur chaque stat, + bonus du thème, plafond 99
create function public._boost_stats(p_stats jsonb, p_boost int, p_bonus jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when p_stats is null then null else (
    select jsonb_object_agg(k, least(99, (v #>> '{}')::int + p_boost + coalesce((p_bonus ->> k)::int, 0)))
    from jsonb_each(p_stats) s(k, v)
  ) end;
$$;

-- Crée les cartes boostées d'un événement (une par carte de base choisie) et renvoie leur nombre
create function public._create_event_cards(p_event int, p_templates int[], p_boost int, p_bonus jsonb, p_label text)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  insert into public.card_templates (player_id, club_id, season, edition, rarity, rating, collection_number, max_supply,
                                     event_id, stats)
  select ct.player_id, ct.club_id, p_label, e.name,
         case when least(99, ct.rating + p_boost) >= 88 then 'legendaire' else 'epique' end::public.rarity,
         least(99, ct.rating + p_boost),
         (select coalesce(max(collection_number), 0) from public.card_templates) + row_number() over (order by ct.rating desc, ct.id),
         40, p_event, public._boost_stats(p.stats, p_boost, p_bonus)
  from public.card_templates ct
  join public.players p on p.id = ct.player_id
  join public.game_events e on e.id = p_event
  where ct.id = any (p_templates);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Booster de l'événement (3 cartes de l'événement), pack offert à chaque joueur, annonce
create function public._open_event_booster(p_event int, p_slug text, p_price int)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  e public.game_events%rowtype;
  v_booster int;
begin
  select * into e from public.game_events where id = p_event;
  insert into public.boosters (slug, name, description, kind, price, cards_count, guarantee_rarity, guarantee_count,
                               starts_at, ends_at, sort_order, category, pool_rule)
  values (p_slug, e.name, e.tagline, 'event', p_price, 3, null, 0, e.starts_at, e.ends_at, 0, 'evenement',
          jsonb_build_object('event_id', e.id))
  returning id into v_booster;
  insert into public.booster_odds (booster_id, rarity, probability) values
    (v_booster, 'epique', 80.00), (v_booster, 'legendaire', 20.00);
  update public.game_events set booster_id = v_booster where id = e.id;
  perform public.refresh_booster_pools();

  -- Un pack offert à chaque joueur actif (notification comprise)
  insert into public.booster_grants (user_id, booster_id, granted_by, reason)
  select p.id, v_booster, null, 'Événement : ' || e.name from public.profiles p where p.banned_at is null;
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'reward', 'Nouvel événement : ' || e.name, coalesce(e.tagline, '') || ' Un pack offert t''attend.', '/boosters'
  from public.profiles p where p.banned_at is null;
  return v_booster;
end;
$$;

-- Lance l'événement du vendredi (thème imposé, ou saisonnier / rotation). Idempotent par créneau.
create function public.launch_weekly_event(p_theme text default null, p_slot timestamptz default null)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_local timestamp := now() at time zone 'Europe/Paris';
  v_today text := to_char(v_local, 'MM-DD');
  v_slot timestamptz := coalesce(p_slot, now());
  t public.event_themes%rowtype;
  r jsonb;
  v_league text;
  v_ids int[];
  v_event int;
begin
  if exists (select 1 from public.game_events where kind = 'weekly' and slot = v_slot) then
    return null;
  end if;
  if p_theme is not null then
    select * into t from public.event_themes where slug = p_theme;
  else
    -- Saisonnier (fenêtre en cours, pas déjà joué ces 300 derniers jours), sinon rotation : le moins récent
    select th.* into t from public.event_themes th
    where th.window_start is not null
      and (case when th.window_start <= th.window_end then v_today between th.window_start and th.window_end
                else v_today >= th.window_start or v_today <= th.window_end end)
      and not exists (select 1 from public.game_events g where g.theme = th.slug and g.created_at > now() - interval '300 days')
    order by th.sort_order limit 1;
    if not found then
      select th.* into t from public.event_themes th
      where th.window_start is null
      order by (select max(g.created_at) from public.game_events g where g.theme = th.slug) nulls first, th.sort_order
      limit 1;
    end if;
  end if;
  if t.slug is null then
    raise exception 'Thème d''événement introuvable' using errcode = 'P0001';
  end if;

  r := t.rule;
  if r ->> 'league' = 'random5' then
    -- Un des 5 grands championnats, parmi ceux qui ont assez de cartes de base
    select l.code into v_league
    from public.leagues l
    where l.code in ('L1', 'PL', 'LL', 'SA', 'BL')
      and (select count(*) from public.card_templates ct join public.clubs c on c.id = ct.club_id
           where c.league_id = l.id and ct.is_active and ct.edition = 'Base' and ct.event_id is null) >= 6
    order by random() limit 1;
  else
    v_league := r ->> 'league';
  end if;

  select array_agg(id) into v_ids from (
    select ct.id
    from public.card_templates ct
    join public.players p on p.id = ct.player_id
    left join public.clubs c on c.id = ct.club_id
    left join public.leagues l on l.id = c.league_id
    where ct.is_active and ct.edition = 'Base' and ct.event_id is null
      and (v_league is null or l.code = v_league)
      and (r ->> 'position' is null or p.position::text = r ->> 'position')
      and (r ->> 'skill_moves_min' is null or p.skill_moves >= (r ->> 'skill_moves_min')::int)
      and (r ->> 'rating_min' is null or ct.rating >= (r ->> 'rating_min')::int)
      and (r ->> 'max_age' is null or p.birthdate > current_date - make_interval(years => (r ->> 'max_age')::int + 1))
      and (r ->> 'min_age' is null or p.birthdate <= current_date - make_interval(years => (r ->> 'min_age')::int))
    order by case when r ->> 'order' = 'random' then random() else 0 end, ct.rating desc, random()
    limit coalesce((r ->> 'count')::int, 12)
  ) x;
  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'Aucun joueur pour le thème %', t.slug using errcode = 'P0001';
  end if;

  insert into public.game_events (kind, theme, name, tagline, color, slot, starts_at, ends_at)
  values ('weekly', t.slug,
          t.name || case when v_league is not null and r ->> 'league' = 'random5'
                         then ' · ' || (select short_name from public.leagues where code = v_league) else '' end,
          t.tagline, t.color, v_slot, now(), v_slot + interval '7 days')
  returning id into v_event;

  perform public._create_event_cards(v_event, v_ids, t.boost, t.stat_bonus,
                                     'Événement du ' || to_char(v_local, 'DD/MM/YYYY'));
  perform public._open_event_booster(v_event, 'evenement-' || v_event, 600);
  perform public._discord_announce(
    'Nouvel événement : ' || (select name from public.game_events where id = v_event),
    t.tagline || E'\n' || cardinality(v_ids) || ' cartes boostées (+' || t.boost || ') à collectionner pendant 7 jours. Un pack offert à chacun !',
    ('x' || substr(t.color, 2))::bit(24)::int);
  return v_event;
end;
$$;

-- Créneau courant : dernier jour donné (1 = lundi … 7 = dimanche) à 19h, heure de Paris
create function public._last_slot(p_isodow int)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  with l as (select now() at time zone 'Europe/Paris' as t),
       s as (select date_trunc('week', t) + make_interval(days => p_isodow - 1) + interval '19 hours' as slot, t from l)
  select (case when slot <= t then slot else slot - interval '7 days' end) at time zone 'Europe/Paris' from s;
$$;

-- Tâche planifiée : événement du vendredi 19h (rattrapé s'il a été manqué dans les 24 h)
create function public.events_tick()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_friday timestamptz := public._last_slot(5);
begin
  if now() < v_friday + interval '24 hours'
     and not exists (select 1 from public.game_events where kind = 'weekly' and slot = v_friday) then
    perform public.launch_weekly_event(null, v_friday);
  end if;
exception when others then
  -- Ne jamais casser la tâche planifiée (nouvelle tentative 5 minutes plus tard)
  raise warning 'events_tick : %', sqlerrm;
end;
$$;

revoke execute on function public._boost_stats(jsonb, int, jsonb) from public, anon, authenticated;
revoke execute on function public._create_event_cards(int, int[], int, jsonb, text) from public, anon, authenticated;
revoke execute on function public._open_event_booster(int, text, int) from public, anon, authenticated;
revoke execute on function public.launch_weekly_event(text, timestamptz) from public, anon, authenticated;
revoke execute on function public._last_slot(int) from public, anon, authenticated;
revoke execute on function public.events_tick() from public, anon, authenticated;

select cron.schedule('petit-pont-events', '*/5 * * * *', $$select public.events_tick()$$);
