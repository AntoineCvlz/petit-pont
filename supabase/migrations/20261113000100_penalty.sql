-- =============================================================================
-- Mini-jeu : tournoi de tirs au but contre l'ordinateur (quart, demi-finale, finale)
--   - Le joueur aligne 5 tireurs et 1 gardien choisis dans SA collection (notes figées au départ).
--   - Séance classique : 5 tirs chacun (le joueur tire en premier), arrêt anticipé dès qu'un écart
--     est irrattrapable, puis mort subite.
--   - À chaque tir, le client n'envoie qu'une direction (gauche / centre / droite) : en attaque son
--     tir, en défense le plongeon de son gardien. Le choix de l'ordinateur et l'issue sont tirés ici.
--   - Gratuit, limite quotidienne (penalty_daily_limit), récompense selon le tour atteint (penalty_rewards).
-- =============================================================================

insert into public.app_settings (key, value, description) values
  ('penalty_daily_limit', '5', 'Tournois de tirs au but par jour (fuseau du jeu)'),
  ('penalty_rewards', '{"quart": 0, "demi": 50, "finale": 100, "victoire": 250}',
   'Pièces gagnées selon le tour atteint au tournoi de tirs au but')
on conflict (key) do nothing;

create table public.penalty_tournaments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'playing' check (status in ('playing', 'won', 'lost', 'abandoned')),
  round smallint not null default 1 check (round between 1 and 3),
  shooters int[] not null check (cardinality(shooters) = 5),          -- modèles de cartes (ordre de tir)
  shooter_ratings smallint[] not null check (cardinality(shooter_ratings) = 5),
  keeper int not null references public.card_templates (id),
  keeper_rating smallint not null,                                      -- note effective (malus si pas gardien)
  reward bigint not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index penalty_one_active_per_user on public.penalty_tournaments (user_id) where status = 'playing';
create index penalty_tournaments_user_idx on public.penalty_tournaments (user_id, created_at desc);

create table public.penalty_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.penalty_tournaments (id) on delete cascade,
  round smallint not null check (round between 1 and 3),
  opponent_club_id smallint references public.clubs (id),
  opp_shooters int[] not null,
  opp_shooter_ratings smallint[] not null,
  opp_keeper int not null references public.card_templates (id),
  opp_keeper_rating smallint not null,
  player_score smallint not null default 0,
  opp_score smallint not null default 0,
  status text not null default 'playing' check (status in ('playing', 'won', 'lost')),
  unique (tournament_id, round)
);

create table public.penalty_kicks (
  match_id uuid not null references public.penalty_matches (id) on delete cascade,
  n smallint not null,                       -- 0, 1, 2… (pair = joueur tire, impair = ordinateur tire)
  side text not null check (side in ('player', 'opponent')),
  shooter int not null references public.card_templates (id),
  direction text not null check (direction in ('gauche', 'centre', 'droite')),
  dive text not null check (dive in ('gauche', 'centre', 'droite')),
  result text not null check (result in ('goal', 'saved', 'missed')),
  primary key (match_id, n)
);

alter table public.penalty_tournaments enable row level security;
alter table public.penalty_matches enable row level security;
alter table public.penalty_kicks enable row level security;
grant select on public.penalty_tournaments, public.penalty_matches, public.penalty_kicks to authenticated;
create policy "Mes tournois" on public.penalty_tournaments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Mes matchs" on public.penalty_matches for select to authenticated
  using (exists (select 1 from public.penalty_tournaments t where t.id = tournament_id
                 and (t.user_id = (select auth.uid()) or (select public.is_admin()))));
create policy "Mes tirs" on public.penalty_kicks for select to authenticated
  using (exists (select 1 from public.penalty_matches m join public.penalty_tournaments t on t.id = m.tournament_id
                 where m.id = match_id and (t.user_id = (select auth.uid()) or (select public.is_admin()))));

create trigger reject_banned_actor before insert or update on public.penalty_tournaments
  for each row execute function public._reject_banned_actor();

-- -----------------------------------------------------------------------------
-- Adversaire d'un tour : un club tiré au sort, ses cartes dans la fourchette de notes du tour,
-- complétées au besoin par d'autres cartes de la même fourchette. Plus fort à chaque tour.
-- -----------------------------------------------------------------------------
create function public._penalty_opponent(p_round smallint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_min int := case p_round when 1 then 70 when 2 then 80 else 86 end;
  v_max int := case p_round when 1 then 82 when 2 then 88 else 99 end;
  v_club smallint;
  v_shooters int[];
  v_keeper int;
begin
  select ct.club_id into v_club
  from public.card_templates ct join public.players p on p.id = ct.player_id
  where ct.is_active and ct.club_id is not null and p.position <> 'GB' and ct.rating between v_min and v_max
  order by random() limit 1;

  -- Tireurs : d'abord ceux du club, puis la fourchette ; un seul exemplaire par footballeur
  with pool as (
    select distinct on (ct.player_id) ct.id, ct.player_id, (ct.club_id = v_club) as own, random() as r
    from public.card_templates ct join public.players p on p.id = ct.player_id
    where ct.is_active and p.position <> 'GB' and ct.rating between v_min and v_max
    order by ct.player_id, (ct.club_id = v_club) desc, random()
  )
  select array_agg(id order by own desc, r) into v_shooters
  from (select id, own, r from pool order by own desc, r limit 5) s;

  select ct.id into v_keeper
  from public.card_templates ct join public.players p on p.id = ct.player_id
  where ct.is_active and p.position = 'GB'
  order by (ct.club_id is not distinct from v_club and ct.rating between v_min and v_max) desc,
           abs(ct.rating - (v_min + v_max) / 2), random()
  limit 1;

  return jsonb_build_object('club', v_club, 'shooters', to_jsonb(v_shooters), 'keeper', v_keeper);
end;
$$;

create function public._penalty_new_match(p_tournament uuid, p_round smallint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o jsonb := public._penalty_opponent(p_round);
  v_shooters int[] := array(select jsonb_array_elements_text(o -> 'shooters')::int);
  v_id uuid;
begin
  insert into public.penalty_matches (tournament_id, round, opponent_club_id, opp_shooters, opp_shooter_ratings,
                                      opp_keeper, opp_keeper_rating)
  values (p_tournament, p_round, (o ->> 'club')::smallint, v_shooters,
          array(select ct.rating from unnest(v_shooters) with ordinality u(id, ord)
                join public.card_templates ct on ct.id = u.id order by u.ord),
          (o ->> 'keeper')::int,
          (select rating from public.card_templates where id = (o ->> 'keeper')::int))
  returning id into v_id;
  return v_id;
end;
$$;

-- Issue d'un tir : cadre manqué selon la note du tireur ; plongeon du bon côté = arrêt possible
-- selon l'écart gardien / tireur ; mauvais côté = but.
create function public._penalty_outcome(p_shooter_rating int, p_keeper_rating int, p_direction text, p_dive text)
returns text
language sql
volatile
set search_path = ''
as $$
  select case
    when random() > least(0.95, greatest(0.75, 0.85 + (p_shooter_rating - 80) * 0.01)) then 'missed'
    when p_direction = p_dive
         and random() < least(0.80, greatest(0.40, 0.60 + (p_keeper_rating - p_shooter_rating) * 0.015)) then 'saved'
    else 'goal'
  end;
$$;

-- Vainqueur d'une séance après un tir (null = la séance continue) :
-- écart irrattrapable pendant les 5 tirs réglementaires, puis mort subite après chaque paire.
create function public._penalty_winner(p_score int, o_score int, p_taken int, o_taken int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_taken <= 5 and o_taken <= 5 and p_score > o_score + (5 - o_taken) then 'player'
    when p_taken <= 5 and o_taken <= 5 and o_score > p_score + (5 - p_taken) then 'opponent'
    when p_taken = o_taken and p_taken >= 5 and p_score > o_score then 'player'
    when p_taken = o_taken and p_taken >= 5 and o_score > p_score then 'opponent'
  end;
$$;

-- Choix de l'ordinateur : au hasard (1/3 chacun), mais une fois sur deux il « lit » le joueur.
--   p_habit : direction préférée du joueur dans ce tournoi (null si aucune donnée)
--   p_follow = true  (gardien de l'ordinateur) : plonge du côté où le joueur tire le plus
--   p_follow = false (tireur de l'ordinateur)  : tire à l'opposé de là où le gardien du joueur plonge le plus
-- Varier ses choix devient donc la bonne stratégie.
create function public._penalty_ai_direction(p_habit text, p_follow boolean)
returns text
language sql
volatile
set search_path = ''
as $$
  select case
    when p_habit is not null and random() < 0.5 then
      case when p_follow then p_habit
           else (array_remove(array['gauche', 'centre', 'droite'], p_habit))[1 + floor(random() * 2)::int] end
    else (array['gauche', 'centre', 'droite'])[1 + floor(random() * 3)::int]
  end;
$$;

create function public._penalty_state(p_tournament uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'status', t.status, 'round', t.round, 'reward', t.reward,
    'shooters', to_jsonb(t.shooters), 'keeper', t.keeper,
    'match', (
      select jsonb_build_object(
        'id', m.id, 'round', m.round, 'status', m.status, 'club', m.opponent_club_id,
        'opp_shooters', to_jsonb(m.opp_shooters), 'opp_keeper', m.opp_keeper,
        'player_score', m.player_score, 'opp_score', m.opp_score,
        'kicks', coalesce((select jsonb_agg(jsonb_build_object('n', k.n, 'side', k.side, 'shooter', k.shooter,
                                                               'direction', k.direction, 'dive', k.dive, 'result', k.result)
                                            order by k.n)
                           from public.penalty_kicks k where k.match_id = m.id), '[]'))
      from public.penalty_matches m where m.tournament_id = t.id order by m.round desc limit 1))
  from public.penalty_tournaments t where t.id = p_tournament;
$$;

-- Fin du tournoi : statut, récompense créditée via le journal
create function public._penalty_finish(p_tournament uuid, p_status text, p_round_reached smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rewards jsonb := coalesce(public.get_setting('penalty_rewards'), '{}');
  v_key text := case when p_status = 'won' then 'victoire'
                     else (array['quart', 'demi', 'finale'])[p_round_reached] end;
  v_reward bigint := coalesce((v_rewards ->> v_key)::bigint, 0);
  v_user uuid;
begin
  update public.penalty_tournaments
  set status = p_status, reward = v_reward, finished_at = now()
  where id = p_tournament
  returning user_id into v_user;
  if v_reward > 0 then
    perform public._apply_coins(v_user, v_reward, 'minigame_reward',
      case when p_status = 'won' then 'Tirs au but : tournoi gagné'
           else 'Tirs au but : ' || case p_round_reached when 2 then 'demi-finale' else 'finale' end end,
      'penalty', p_tournament::text);
  end if;
end;
$$;

revoke execute on function public._penalty_opponent(smallint) from public, anon, authenticated;
revoke execute on function public._penalty_new_match(uuid, smallint) from public, anon, authenticated;
revoke execute on function public._penalty_outcome(int, int, text, text) from public, anon, authenticated;
revoke execute on function public._penalty_ai_direction(text, boolean) from public, anon, authenticated;
revoke execute on function public._penalty_winner(int, int, int, int) from public, anon, authenticated;
revoke execute on function public._penalty_state(uuid) from public, anon, authenticated;
revoke execute on function public._penalty_finish(uuid, text, smallint) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------
create function public.penalty_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := public._game_timezone();
  v_limit int := coalesce((public.get_setting('penalty_daily_limit'))::int, 5);
  v_used int;
  v_active uuid;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  select count(*) into v_used from public.penalty_tournaments
  where user_id = v_uid and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date;
  select id into v_active from public.penalty_tournaments where user_id = v_uid and status = 'playing';
  return jsonb_build_object(
    'daily_limit', v_limit, 'remaining', greatest(0, v_limit - v_used),
    'rewards', coalesce(public.get_setting('penalty_rewards'), '{}'),
    'played', (select count(*) from public.penalty_tournaments where user_id = v_uid and status <> 'playing'),
    'wins', (select count(*) from public.penalty_tournaments where user_id = v_uid and status = 'won'),
    'active', case when v_active is null then null else public._penalty_state(v_active) end);
end;
$$;

create function public.start_penalty_tournament(p_shooters uuid[], p_keeper uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := public._game_timezone();
  v_limit int := coalesce((public.get_setting('penalty_daily_limit'))::int, 5);
  v_tpls int[];
  v_ratings smallint[];
  v_keeper int;
  v_keeper_rating smallint;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where id = v_uid for update;

  if exists (select 1 from public.penalty_tournaments where user_id = v_uid and status = 'playing') then
    raise exception 'Termine d''abord ton tournoi en cours' using errcode = 'P0001';
  end if;
  if (select count(*) from public.penalty_tournaments
      where user_id = v_uid and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date) >= v_limit then
    raise exception 'Plus de tournoi disponible aujourd''hui : reviens demain !' using errcode = 'P0001';
  end if;

  if p_shooters is null or cardinality(p_shooters) <> 5
     or (select count(distinct x) from unnest(p_shooters) x) <> 5 or p_keeper = any (p_shooters) then
    raise exception 'Choisis 5 tireurs différents et un gardien' using errcode = 'P0001';
  end if;

  -- Cartes de SA collection ; un même footballeur ne tire qu'une fois
  select array_agg(ci.template_id order by u.ord), array_agg(ct.rating order by u.ord)
  into v_tpls, v_ratings
  from unnest(p_shooters) with ordinality u(id, ord)
  join public.card_instances ci on ci.id = u.id and ci.owner_id = v_uid
  join public.card_templates ct on ct.id = ci.template_id;
  if cardinality(v_tpls) is distinct from 5
     or (select count(distinct ct.player_id) from public.card_templates ct where ct.id = any (v_tpls)) <> 5 then
    raise exception 'Tireurs invalides : 5 footballeurs différents de ta collection' using errcode = 'P0001';
  end if;

  -- Gardien : un joueur de champ peut garder les buts, avec un gros malus
  select ci.template_id, case when p.position = 'GB' then ct.rating else greatest(40, ct.rating - 20) end
  into v_keeper, v_keeper_rating
  from public.card_instances ci
  join public.card_templates ct on ct.id = ci.template_id
  join public.players p on p.id = ct.player_id
  where ci.id = p_keeper and ci.owner_id = v_uid;
  if v_keeper is null then
    raise exception 'Gardien invalide : choisis une carte de ta collection' using errcode = 'P0001';
  end if;

  insert into public.penalty_tournaments (user_id, shooters, shooter_ratings, keeper, keeper_rating)
  values (v_uid, v_tpls, v_ratings, v_keeper, v_keeper_rating)
  returning id into v_id;
  perform public._penalty_new_match(v_id, 1::smallint);
  return public._penalty_state(v_id);
end;
$$;

create function public.penalty_kick(p_tournament_id uuid, p_direction text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  t public.penalty_tournaments%rowtype;
  m public.penalty_matches%rowtype;
  v_n smallint;
  v_side text;
  v_taken int;
  v_shooter int;
  v_shooter_rating int;
  v_keeper_rating int;
  v_direction text;
  v_dive text;
  v_result text;
  p_taken int;
  o_taken int;
  v_winner text;
  v_habit text;
begin
  if p_direction is null or p_direction not in ('gauche', 'centre', 'droite') then
    raise exception 'Direction invalide' using errcode = 'P0001';
  end if;

  select * into t from public.penalty_tournaments where id = p_tournament_id for update;
  if not found or t.user_id is distinct from auth.uid() then
    raise exception 'Tournoi introuvable' using errcode = 'P0001';
  end if;
  if t.status <> 'playing' then
    raise exception 'Ce tournoi est terminé' using errcode = 'P0001';
  end if;
  select * into m from public.penalty_matches where tournament_id = t.id and round = t.round for update;

  select count(*) into v_n from public.penalty_kicks where match_id = m.id;
  v_side := case when v_n % 2 = 0 then 'player' else 'opponent' end;
  v_taken := v_n / 2;  -- tirs déjà effectués par ce camp

  if v_side = 'player' then
    v_shooter := t.shooters[v_taken % 5 + 1];
    v_shooter_rating := t.shooter_ratings[v_taken % 5 + 1];
    v_keeper_rating := m.opp_keeper_rating;
    v_direction := p_direction;
    -- Où le joueur tire-t-il le plus souvent dans ce tournoi ?
    select k.direction into v_habit
    from public.penalty_kicks k join public.penalty_matches pm on pm.id = k.match_id
    where pm.tournament_id = t.id and k.side = 'player'
    group by k.direction order by count(*) desc, random() limit 1;
    v_dive := public._penalty_ai_direction(v_habit, true);
  else
    v_shooter := m.opp_shooters[v_taken % 5 + 1];
    v_shooter_rating := m.opp_shooter_ratings[v_taken % 5 + 1];
    v_keeper_rating := t.keeper_rating;
    -- Où le gardien du joueur plonge-t-il le plus souvent ?
    select k.dive into v_habit
    from public.penalty_kicks k join public.penalty_matches pm on pm.id = k.match_id
    where pm.tournament_id = t.id and k.side = 'opponent'
    group by k.dive order by count(*) desc, random() limit 1;
    v_direction := public._penalty_ai_direction(v_habit, false);
    v_dive := p_direction;
  end if;

  v_result := public._penalty_outcome(v_shooter_rating, v_keeper_rating, v_direction, v_dive);
  insert into public.penalty_kicks (match_id, n, side, shooter, direction, dive, result)
  values (m.id, v_n, v_side, v_shooter, v_direction, v_dive, v_result);

  if v_result = 'goal' then
    if v_side = 'player' then m.player_score := m.player_score + 1; else m.opp_score := m.opp_score + 1; end if;
  end if;

  -- Fin de séance (règles dans _penalty_winner)
  p_taken := (v_n + 2) / 2;
  o_taken := (v_n + 1) / 2;
  v_winner := public._penalty_winner(m.player_score, m.opp_score, p_taken, o_taken);

  update public.penalty_matches
  set player_score = m.player_score, opp_score = m.opp_score,
      status = case v_winner when 'player' then 'won' when 'opponent' then 'lost' else 'playing' end
  where id = m.id;

  if v_winner = 'player' then
    if t.round = 3 then
      perform public._penalty_finish(t.id, 'won', 3::smallint);
    else
      update public.penalty_tournaments set round = round + 1 where id = t.id;
      perform public._penalty_new_match(t.id, (t.round + 1)::smallint);
    end if;
  elsif v_winner = 'opponent' then
    perform public._penalty_finish(t.id, 'lost', t.round);
  end if;

  return public._penalty_state(t.id)
    || jsonb_build_object('last_kick', jsonb_build_object(
         'side', v_side, 'shooter', v_shooter, 'direction', v_direction, 'dive', v_dive, 'result', v_result,
         'match_over', v_winner is not null, 'winner', v_winner, 'match_round', m.round,
         'player_score', m.player_score, 'opp_score', m.opp_score));
end;
$$;

-- Abandon : le match en cours est perdu (récompense du tour atteint)
create function public.abandon_penalty_tournament(p_tournament_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  t public.penalty_tournaments%rowtype;
begin
  select * into t from public.penalty_tournaments where id = p_tournament_id for update;
  if not found or t.user_id is distinct from auth.uid() or t.status <> 'playing' then
    raise exception 'Tournoi introuvable' using errcode = 'P0001';
  end if;
  update public.penalty_matches set status = 'lost' where tournament_id = t.id and round = t.round;
  perform public._penalty_finish(t.id, 'abandoned', t.round);
end;
$$;

-- Classement : tournois gagnés (puis finales atteintes), comptes suspendus exclus
create function public.penalty_leaderboard(p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, avatar_url text, wins bigint, finals bigint,
               played bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select t.user_id,
           count(*) filter (where t.status = 'won') as wins,
           count(*) filter (where t.status = 'won' or t.round = 3) as finals,
           count(*) as played
    from public.penalty_tournaments t
    join public.profiles p on p.id = t.user_id
    where t.status <> 'playing' and p.banned_at is null
    group by t.user_id
  )
  select rank() over (order by s.wins desc, s.finals desc), s.user_id, p.username, p.avatar_url,
         s.wins, s.finals, s.played, s.user_id = auth.uid()
  from s join public.profiles p on p.id = s.user_id
  where s.wins > 0 or s.finals > 0
  order by s.wins desc, s.finals desc, s.played
  limit least(greatest(p_limit, 1), 200);
$$;

revoke execute on function public.penalty_status() from public, anon;
revoke execute on function public.start_penalty_tournament(uuid[], uuid) from public, anon;
revoke execute on function public.penalty_kick(uuid, text) from public, anon;
revoke execute on function public.abandon_penalty_tournament(uuid) from public, anon;
revoke execute on function public.penalty_leaderboard(int) from public, anon;
grant execute on function public.penalty_status() to authenticated;
grant execute on function public.start_penalty_tournament(uuid[], uuid) to authenticated;
grant execute on function public.penalty_kick(uuid, text) to authenticated;
grant execute on function public.abandon_penalty_tournament(uuid) to authenticated;
grant execute on function public.penalty_leaderboard(int) to authenticated;
