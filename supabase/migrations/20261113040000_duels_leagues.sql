-- =============================================================================
-- Matchs entre joueurs (asynchrones) et ligues privées
--   - Un « duel » oppose deux joueurs avec leur onze de saison. Chacun choisit ses deux tactiques
--     (une par mi-temps) quand il veut ; dès que les deux camps ont joué, le match est simulé par la base
--     (même moteur que la saison : force d'équipe figée au moment du choix, duel tactique, loi de Poisson).
--   - Matchs amicaux : défi lancé à un joueur, 48 h pour répondre, classement Elo.
--   - Ligues privées : 3 à 8 joueurs, code d'invitation, championnat aller-retour, une journée par jour ;
--     à l'échéance, un camp qui n'a pas joué reçoit des tactiques au hasard.
-- =============================================================================

alter table public.profiles add column elo int not null default 1000;

create table public.private_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  status text not null default 'open' check (status in ('open', 'running', 'finished')),
  max_members smallint not null default 8 check (max_members between 3 and 8),
  started_at timestamptz,
  finished_at timestamptz,
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.private_league_members (
  league_id uuid not null references public.private_leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  points smallint not null default 0,
  played smallint not null default 0,
  wins smallint not null default 0,
  draws smallint not null default 0,
  losses smallint not null default 0,
  goals_for smallint not null default 0,
  goals_against smallint not null default 0,
  primary key (league_id, user_id)
);
create index private_league_members_user_idx on public.private_league_members (user_id);

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('friendly', 'league')),
  league_id uuid references public.private_leagues (id) on delete cascade,
  round smallint,
  home_id uuid not null references public.profiles (id) on delete cascade,
  away_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'played', 'declined', 'expired', 'cancelled')),
  home_tactics text[],
  away_tactics text[],
  home_strength numeric(4, 1),
  away_strength numeric(4, 1),
  home_goals smallint[],
  away_goals smallint[],
  home_elo_delta smallint,
  away_elo_delta smallint,
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  played_at timestamptz,
  constraint duel_not_self check (home_id <> away_id),
  constraint duel_league check ((kind = 'league') = (league_id is not null))
);
create index duels_home_idx on public.duels (home_id, created_at desc);
create index duels_away_idx on public.duels (away_id, created_at desc);
create index duels_league_idx on public.duels (league_id, round);
create index duels_waiting_idx on public.duels (deadline) where status = 'waiting';

alter table public.private_leagues enable row level security;
alter table public.private_league_members enable row level security;
alter table public.duels enable row level security;
grant select on public.private_leagues, public.private_league_members, public.duels to authenticated;

create function public._is_league_member(p_league uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.private_league_members where league_id = p_league and user_id = auth.uid());
$$;

create policy "Ligues de mes membres" on public.private_leagues for select to authenticated
  using ((select public._is_league_member(id)) or (select public.is_admin()));
create policy "Membres visibles par les membres" on public.private_league_members for select to authenticated
  using ((select public._is_league_member(league_id)) or (select public.is_admin()));
-- Les tactiques d'un camp restent cachées tant que le match n'est pas joué : lecture via vue/RPC
create policy "Mes matchs et ceux de mes ligues" on public.duels for select to authenticated
  using (home_id = (select auth.uid()) or away_id = (select auth.uid())
         or (league_id is not null and (select public._is_league_member(league_id)))
         or (select public.is_admin()));
-- Pas de lecture directe des colonnes de tactiques : seules les RPC les exposent (et seulement après le match)
revoke select on public.duels from authenticated;
grant select (id, kind, league_id, round, home_id, away_id, status, home_strength, away_strength, home_goals, away_goals,
              home_elo_delta, away_elo_delta, deadline, created_at, played_at) on public.duels to authenticated;

create trigger reject_banned_actor before insert on public.duels
  for each row execute function public._reject_banned_actor();
create trigger reject_banned_actor before insert or update on public.private_leagues
  for each row execute function public._reject_banned_actor();

-- -----------------------------------------------------------------------------
-- Moteur
-- -----------------------------------------------------------------------------
create function public._valid_tactics(p_tactics text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_tactics is not null and cardinality(p_tactics) = 2
     and p_tactics <@ array['pressing', 'possession', 'contre'];
$$;

create function public._random_tactics()
returns text[]
language sql
volatile
set search_path = ''
as $$
  select array[(array['pressing', 'possession', 'contre'])[1 + floor(random() * 3)::int],
               (array['pressing', 'possession', 'contre'])[1 + floor(random() * 3)::int]];
$$;

-- Force du onze d'un joueur (ou 60 s'il n'a pas d'équipe complète : forfait technique)
create function public._duel_strength(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when (public._season_team(p_user) ->> 'complete')::boolean
              then (public._season_team(p_user) ->> 'strength')::numeric else 60 end;
$$;

-- Joue un duel dont les deux camps ont choisi : buts, Elo (amical), classement (ligue), notifications
create function public._duel_play(p_duel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.duels%rowtype;
  h1 smallint[];
  h2 smallint[];
  v_home int;
  v_away int;
  v_res numeric;           -- 1 victoire domicile, 0,5 nul, 0 défaite
  v_home_elo int;
  v_away_elo int;
  v_delta int;
  v_home_name text;
  v_away_name text;
begin
  select * into d from public.duels where id = p_duel for update;
  if d.status <> 'waiting' or d.home_tactics is null or d.away_tactics is null then
    return;
  end if;

  h1 := public._season_half(d.home_strength, d.away_strength, d.home_tactics[1], d.away_tactics[1]);
  h2 := public._season_half(d.home_strength, d.away_strength, d.home_tactics[2], d.away_tactics[2]);
  v_home := h1[1] + h2[1];
  v_away := h1[2] + h2[2];
  v_res := case when v_home > v_away then 1 when v_home = v_away then 0.5 else 0 end;

  update public.duels
  set status = 'played', played_at = now(), home_goals = array[h1[1], h2[1]], away_goals = array[h1[2], h2[2]]
  where id = d.id;

  if d.kind = 'friendly' then
    select elo into v_home_elo from public.profiles where id = d.home_id for update;
    select elo into v_away_elo from public.profiles where id = d.away_id for update;
    v_delta := round(24 * (v_res - 1 / (1 + power(10, (v_away_elo - v_home_elo) / 400.0))));
    update public.profiles set elo = elo + v_delta where id = d.home_id;
    update public.profiles set elo = elo - v_delta where id = d.away_id;
    update public.duels set home_elo_delta = v_delta, away_elo_delta = -v_delta where id = d.id;
  else
    update public.private_league_members
    set played = played + 1, goals_for = goals_for + v_home, goals_against = goals_against + v_away,
        wins = wins + (v_res = 1)::int, draws = draws + (v_res = 0.5)::int, losses = losses + (v_res = 0)::int,
        points = points + case when v_res = 1 then 3 when v_res = 0.5 then 1 else 0 end
    where league_id = d.league_id and user_id = d.home_id;
    update public.private_league_members
    set played = played + 1, goals_for = goals_for + v_away, goals_against = goals_against + v_home,
        wins = wins + (v_res = 0)::int, draws = draws + (v_res = 0.5)::int, losses = losses + (v_res = 1)::int,
        points = points + case when v_res = 0 then 3 when v_res = 0.5 then 1 else 0 end
    where league_id = d.league_id and user_id = d.away_id;
    perform public._league_maybe_finish(d.league_id);
  end if;

  select username into v_home_name from public.profiles where id = d.home_id;
  select username into v_away_name from public.profiles where id = d.away_id;
  insert into public.notifications (user_id, type, title, body, link)
  values
    (d.home_id, 'duel', case when v_res = 1 then 'Victoire' when v_res = 0.5 then 'Match nul' else 'Défaite' end
       || ' contre ' || v_away_name, v_home || '–' || v_away, case when d.kind = 'league' then '/ligues/' || d.league_id else '/matchs' end),
    (d.away_id, 'duel', case when v_res = 0 then 'Victoire' when v_res = 0.5 then 'Match nul' else 'Défaite' end
       || ' contre ' || v_home_name, v_away || '–' || v_home, case when d.kind = 'league' then '/ligues/' || d.league_id else '/matchs' end);
end;
$$;

-- Fin de ligue : tous les matchs joués → vainqueur (points, différence de buts, buts marqués)
create function public._league_maybe_finish(p_league uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_winner uuid;
  v_name text;
begin
  if exists (select 1 from public.duels where league_id = p_league and status = 'waiting') then
    return;
  end if;
  select user_id into v_winner from public.private_league_members where league_id = p_league
  order by points desc, goals_for - goals_against desc, goals_for desc, joined_at limit 1;
  update public.private_leagues set status = 'finished', finished_at = now(), winner_id = v_winner
  where id = p_league and status = 'running'
  returning name into v_name;
  if v_name is not null then
    insert into public.notifications (user_id, type, title, body, link)
    select m.user_id, 'league', 'Ligue « ' || v_name || ' » terminée',
           (select username from public.profiles where id = v_winner) || ' remporte le titre !', '/ligues/' || p_league
    from public.private_league_members m where m.league_id = p_league;
  end if;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['_is_league_member(uuid)', '_valid_tactics(text[])', '_random_tactics()', '_duel_strength(uuid)',
                           '_duel_play(uuid)', '_league_maybe_finish(uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
  end loop;
  foreach f in array array['_valid_tactics(text[])', '_random_tactics()', '_duel_strength(uuid)', '_duel_play(uuid)',
                           '_league_maybe_finish(uuid)']
  loop
    execute format('revoke execute on function public.%s from authenticated', f);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Matchs amicaux
-- -----------------------------------------------------------------------------
create function public.challenge_player(p_opponent uuid, p_tactics text[])
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  if not public._valid_tactics(p_tactics) then
    raise exception 'Choisis une tactique par mi-temps' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  if p_opponent = v_uid or not exists (select 1 from public.profiles where id = p_opponent and banned_at is null) then
    raise exception 'Joueur introuvable' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.blocks where (blocker_id = v_uid and blocked_id = p_opponent)
                                             or (blocker_id = p_opponent and blocked_id = v_uid)) then
    raise exception 'Impossible de défier ce joueur' using errcode = 'P0001';
  end if;
  if not coalesce((public._season_team(v_uid) ->> 'complete')::boolean, false) then
    raise exception 'Compose d''abord ton onze (page Saison)' using errcode = 'P0001';
  end if;
  if (select count(*) from public.duels where kind = 'friendly' and home_id = v_uid and status = 'waiting') >= 5 then
    raise exception '5 défis en attente au maximum' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.duels where kind = 'friendly' and status = 'waiting'
             and ((home_id = v_uid and away_id = p_opponent) or (home_id = p_opponent and away_id = v_uid))) then
    raise exception 'Un défi est déjà en cours avec ce joueur' using errcode = 'P0001';
  end if;

  insert into public.duels (kind, home_id, away_id, home_tactics, home_strength, deadline)
  values ('friendly', v_uid, p_opponent, p_tactics, public._duel_strength(v_uid), now() + interval '48 hours')
  returning id into v_id;

  select username into v_name from public.profiles where id = v_uid;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_opponent, 'duel', v_name || ' te défie !', 'Choisis tes tactiques avant 48 h.', '/matchs');
  return v_id;
end;
$$;

-- Choix des tactiques par le camp qui n'a pas encore joué (réponse à un défi ou match de ligue)
create function public.play_duel(p_duel uuid, p_tactics text[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  d public.duels%rowtype;
begin
  if not public._valid_tactics(p_tactics) then
    raise exception 'Choisis une tactique par mi-temps' using errcode = 'P0001';
  end if;
  select * into d from public.duels where id = p_duel for update;
  if not found or v_uid not in (d.home_id, d.away_id) then
    raise exception 'Match introuvable' using errcode = 'P0001';
  end if;
  if d.status <> 'waiting' then
    raise exception 'Ce match n''est plus en attente' using errcode = 'P0001';
  end if;
  if (v_uid = d.home_id and d.home_tactics is not null) or (v_uid = d.away_id and d.away_tactics is not null) then
    raise exception 'Tu as déjà choisi tes tactiques pour ce match' using errcode = 'P0001';
  end if;
  if not coalesce((public._season_team(v_uid) ->> 'complete')::boolean, false) then
    raise exception 'Compose d''abord ton onze (page Saison)' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and banned_at is not null) then
    raise exception 'Ton compte est suspendu' using errcode = 'P0001';
  end if;

  if v_uid = d.home_id then
    update public.duels set home_tactics = p_tactics, home_strength = public._duel_strength(v_uid) where id = d.id;
  else
    update public.duels set away_tactics = p_tactics, away_strength = public._duel_strength(v_uid) where id = d.id;
  end if;
  perform public._duel_play(d.id);
  return public.duel_detail(d.id);
end;
$$;

create function public.decline_duel(p_duel uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.duels set status = case when away_id = auth.uid() then 'declined' else 'cancelled' end
  where id = p_duel and kind = 'friendly' and status = 'waiting' and auth.uid() in (home_id, away_id);
  if not found then
    raise exception 'Défi introuvable' using errcode = 'P0001';
  end if;
end;
$$;

-- Détail d'un match : les tactiques d'un camp ne sont révélées qu'après le match (ou à lui-même)
create function public.duel_detail(p_duel uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id, 'kind', d.kind, 'league_id', d.league_id, 'round', d.round, 'status', d.status,
    'home_id', d.home_id, 'away_id', d.away_id,
    'home_name', (select username from public.profiles where id = d.home_id),
    'away_name', (select username from public.profiles where id = d.away_id),
    'home_avatar', (select avatar_url from public.profiles where id = d.home_id),
    'away_avatar', (select avatar_url from public.profiles where id = d.away_id),
    'home_played', d.home_tactics is not null, 'away_played', d.away_tactics is not null,
    'home_tactics', case when d.status = 'played' or d.home_id = auth.uid() then to_jsonb(d.home_tactics) end,
    'away_tactics', case when d.status = 'played' or d.away_id = auth.uid() then to_jsonb(d.away_tactics) end,
    'home_strength', d.home_strength, 'away_strength', d.away_strength,
    'home_goals', to_jsonb(d.home_goals), 'away_goals', to_jsonb(d.away_goals),
    'home_elo_delta', d.home_elo_delta, 'away_elo_delta', d.away_elo_delta,
    'deadline', d.deadline, 'created_at', d.created_at, 'played_at', d.played_at)
  from public.duels d
  where d.id = p_duel
    and (auth.uid() in (d.home_id, d.away_id) or (d.league_id is not null and public._is_league_member(d.league_id))
         or public.is_admin());
$$;

-- Mes matchs amicaux (en attente puis récents)
create function public.my_duels(p_limit int default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.duel_detail(d.id) order by (d.status = 'waiting') desc, d.created_at desc), '[]')
  from (select id, status, created_at from public.duels
        where kind = 'friendly' and auth.uid() in (home_id, away_id)
        order by (status = 'waiting') desc, created_at desc limit least(greatest(p_limit, 1), 100)) d;
$$;

create function public.elo_leaderboard(p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, avatar_url text, elo int, played bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select p.id, p.username, p.avatar_url, p.elo,
           (select count(*) from public.duels d where d.kind = 'friendly' and d.status = 'played' and p.id in (d.home_id, d.away_id)) as played
    from public.profiles p where p.banned_at is null
  )
  select rank() over (order by s.elo desc), s.id, s.username, s.avatar_url, s.elo, s.played, s.id = auth.uid()
  from s where s.played > 0
  order by s.elo desc, s.played desc
  limit least(greatest(p_limit, 1), 200);
$$;

-- -----------------------------------------------------------------------------
-- Ligues privées
-- -----------------------------------------------------------------------------
create function public.create_league(p_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 3 and 40 then
    raise exception 'Nom de ligue : 3 à 40 caractères' using errcode = 'P0001';
  end if;
  if (select count(*) from public.private_league_members m join public.private_leagues l on l.id = m.league_id
      where m.user_id = v_uid and l.status <> 'finished') >= 3 then
    raise exception '3 ligues en cours au maximum' using errcode = 'P0001';
  end if;
  insert into public.private_leagues (name, owner_id) values (btrim(p_name), v_uid) returning id into v_id;
  insert into public.private_league_members (league_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

create function public.join_league(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  l public.private_leagues%rowtype;
begin
  select * into l from public.private_leagues where invite_code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then
    raise exception 'Code de ligue inconnu' using errcode = 'P0001';
  end if;
  if l.status <> 'open' then
    raise exception 'Cette ligue a déjà commencé' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.private_league_members where league_id = l.id and user_id = v_uid) then
    return l.id;
  end if;
  if (select count(*) from public.private_league_members where league_id = l.id) >= l.max_members then
    raise exception 'Ligue complète' using errcode = 'P0001';
  end if;
  if (select count(*) from public.private_league_members m join public.private_leagues x on x.id = m.league_id
      where m.user_id = v_uid and x.status <> 'finished') >= 3 then
    raise exception '3 ligues en cours au maximum' using errcode = 'P0001';
  end if;
  insert into public.private_league_members (league_id, user_id) values (l.id, v_uid);
  insert into public.notifications (user_id, type, title, body, link)
  values (l.owner_id, 'league', (select username from public.profiles where id = v_uid) || ' a rejoint « ' || l.name || ' »',
          null, '/ligues/' || l.id);
  return l.id;
end;
$$;

create function public.leave_league(p_league uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.private_leagues%rowtype;
begin
  select * into l from public.private_leagues where id = p_league for update;
  if not found or l.status <> 'open' then
    raise exception 'On ne quitte pas une ligue commencée' using errcode = 'P0001';
  end if;
  delete from public.private_league_members where league_id = l.id and user_id = auth.uid();
  if l.owner_id = auth.uid() then
    delete from public.private_leagues where id = l.id;   -- le créateur dissout la ligue
  end if;
end;
$$;

-- Lancement : championnat aller-retour (méthode du cercle), une journée par jour
create function public.start_league(p_league uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.private_leagues%rowtype;
  v_players uuid[];
  n int;
  half int;
  r int;
  i int;
  a uuid;
  b uuid;
  v_round int;
begin
  select * into l from public.private_leagues where id = p_league for update;
  if not found or l.owner_id is distinct from auth.uid() then
    raise exception 'Seul le créateur peut lancer la ligue' using errcode = 'P0001';
  end if;
  if l.status <> 'open' then
    raise exception 'Ligue déjà lancée' using errcode = 'P0001';
  end if;
  select array_agg(user_id order by random()) into v_players from public.private_league_members where league_id = l.id;
  if cardinality(v_players) < 3 then
    raise exception 'Il faut au moins 3 joueurs' using errcode = 'P0001';
  end if;
  if cardinality(v_players) % 2 = 1 then
    v_players := v_players || null::uuid;    -- exempt
  end if;
  n := cardinality(v_players);
  half := n / 2;

  for r in 0 .. n - 2 loop
    for i in 1 .. half loop
      a := v_players[i];
      b := v_players[n + 1 - i];
      continue when a is null or b is null;
      if r % 2 = 1 then
        a := v_players[n + 1 - i];
        b := v_players[i];
      end if;
      -- aller (journée r+1) et retour (journée r+n), domicile inversé
      insert into public.duels (kind, league_id, round, home_id, away_id, deadline)
      values ('league', l.id, r + 1, a, b, date_trunc('day', now()) + make_interval(days => r + 2)),
             ('league', l.id, r + n, b, a, date_trunc('day', now()) + make_interval(days => r + n + 1));
    end loop;
    -- rotation : le premier reste fixe
    v_players := array[v_players[1]] || v_players[n] || v_players[2:n - 1];
  end loop;

  update public.private_leagues set status = 'running', started_at = now() where id = l.id;
  insert into public.notifications (user_id, type, title, body, link)
  select m.user_id, 'league', 'La ligue « ' || l.name || ' » commence !', 'Une journée par jour : choisis tes tactiques.',
         '/ligues/' || l.id
  from public.private_league_members m where m.league_id = l.id;
end;
$$;

create function public.league_detail(p_league uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'owner_id', l.owner_id, 'status', l.status, 'max_members', l.max_members,
    'invite_code', l.invite_code, 'started_at', l.started_at, 'finished_at', l.finished_at, 'winner_id', l.winner_id,
    'members', (select jsonb_agg(jsonb_build_object(
                  'user_id', m.user_id, 'username', p.username, 'avatar_url', p.avatar_url, 'points', m.points, 'played', m.played,
                  'wins', m.wins, 'draws', m.draws, 'losses', m.losses, 'goals_for', m.goals_for, 'goals_against', m.goals_against)
                  order by m.points desc, m.goals_for - m.goals_against desc, m.goals_for desc, m.joined_at)
                from public.private_league_members m join public.profiles p on p.id = m.user_id where m.league_id = l.id),
    'duels', (select coalesce(jsonb_agg(public.duel_detail(d.id) order by d.round, d.created_at), '[]')
              from public.duels d where d.league_id = l.id))
  from public.private_leagues l
  where l.id = p_league and (public._is_league_member(l.id) or public.is_admin());
$$;

create function public.my_leagues()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'name', l.name, 'status', l.status, 'members', (select count(*) from public.private_league_members x where x.league_id = l.id),
    'max_members', l.max_members, 'winner', (select username from public.profiles where id = l.winner_id),
    'to_play', (select count(*) from public.duels d where d.league_id = l.id and d.status = 'waiting'
                and ((d.home_id = auth.uid() and d.home_tactics is null) or (d.away_id = auth.uid() and d.away_tactics is null))))
    order by (l.status = 'finished'), l.created_at desc), '[]')
  from public.private_leagues l
  join public.private_league_members m on m.league_id = l.id and m.user_id = auth.uid();
$$;

-- Échéances (pg_cron, toutes les heures) : défis amicaux expirés ; matchs de ligue joués d'office
create function public.resolve_due_duels()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  v_count int := 0;
begin
  update public.duels set status = 'expired' where kind = 'friendly' and status = 'waiting' and deadline < now();
  for d in select id, home_id, away_id, home_tactics, away_tactics from public.duels
           where kind = 'league' and status = 'waiting' and deadline < now() order by deadline, id for update
  loop
    update public.duels
    set home_tactics = coalesce(home_tactics, public._random_tactics()),
        home_strength = coalesce(home_strength, public._duel_strength(home_id)),
        away_tactics = coalesce(away_tactics, public._random_tactics()),
        away_strength = coalesce(away_strength, public._duel_strength(away_id))
    where id = d.id;
    perform public._duel_play(d.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.resolve_due_duels() from public, anon, authenticated;
select cron.schedule('petit-pont-resolve-duels', '5 * * * *', $$select public.resolve_due_duels()$$);

do $$
declare
  f text;
begin
  foreach f in array array['challenge_player(uuid, text[])', 'play_duel(uuid, text[])', 'decline_duel(uuid)', 'duel_detail(uuid)',
                           'my_duels(int)', 'elo_leaderboard(int)', 'create_league(text)', 'join_league(text)',
                           'leave_league(uuid)', 'start_league(uuid)', 'league_detail(uuid)', 'my_leagues()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
