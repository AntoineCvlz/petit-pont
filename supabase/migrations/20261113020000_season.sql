-- =============================================================================
-- Saison de clubs : 10 journées contre l'ordinateur avec son onze (cartes de sa collection).
--   - Force d'équipe = note moyenne effective (−15 hors poste) + collectif / 10 (liens du Draft).
--   - Match en deux mi-temps ; à chaque mi-temps, une tactique (pressing > possession > contre > pressing).
--     L'ordinateur choisit au hasard, mais une fois sur deux il contre la tactique favorite du joueur.
--   - Buts tirés côté serveur (loi de Poisson selon l'écart de force et le duel tactique).
--   - 3 matchs par jour ; paliers de points récompensés en packs ; divisions (montée à 18 pts, descente sous 9 pts),
--     le dernier palier rapporte davantage dans les divisions supérieures.
-- =============================================================================

insert into public.app_settings (key, value, description) values
  ('season_daily_matches', '3', 'Matchs de saison jouables par jour (fuseau du jeu)'),
  ('season_rewards',
   '[{"points": 6, "booster": "gratuit", "count": 1}, {"points": 12, "booster": "standard", "count": 1},
     {"points": 18, "booster": "standard", "count": 1}, {"points": 24, "booster": "premium", "count": 1}]',
   'Paliers de points d''une saison et packs associés')
on conflict (key) do nothing;

create table public.season_squads (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  formation text not null references public.draft_formations (code),
  slots jsonb not null,                    -- { "GB": "<instance uuid>", "DG": "…", … }
  updated_at timestamptz not null default now()
);

create table public.season_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  number int not null,                     -- 1re, 2e… saison du joueur
  tier smallint not null,                  -- division (0 à 5) : montée à 18 pts, descente sous 9 pts
  status text not null default 'active' check (status in ('active', 'finished', 'abandoned')),
  matchday smallint not null default 1,    -- prochaine journée (1 à 10, 11 = terminée)
  points smallint not null default 0,
  wins smallint not null default 0,
  draws smallint not null default 0,
  losses smallint not null default 0,
  goals_for smallint not null default 0,
  goals_against smallint not null default 0,
  rewards_given smallint[] not null default '{}',   -- paliers déjà récompensés
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index season_one_active_per_user on public.season_runs (user_id) where status = 'active';

create table public.season_fixtures (
  run_id uuid not null references public.season_runs (id) on delete cascade,
  matchday smallint not null check (matchday between 1 and 10),
  opponent_club_id smallint references public.clubs (id),
  opp_strength numeric(4, 1) not null,
  team_strength numeric(4, 1),
  status text not null default 'scheduled' check (status in ('scheduled', 'half', 'played')),
  tactic1 text, opp_tactic1 text, tactic2 text, opp_tactic2 text,
  goals1 smallint, opp_goals1 smallint, goals2 smallint, opp_goals2 smallint,
  started_at timestamptz,
  played_at timestamptz,
  primary key (run_id, matchday)
);

alter table public.season_squads enable row level security;
alter table public.season_runs enable row level security;
alter table public.season_fixtures enable row level security;
grant select on public.season_squads, public.season_runs, public.season_fixtures to authenticated;
create policy "Mon équipe" on public.season_squads for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Mes saisons" on public.season_runs for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Mes matchs" on public.season_fixtures for select to authenticated
  using (exists (select 1 from public.season_runs r where r.id = run_id
                 and (r.user_id = (select auth.uid()) or (select public.is_admin()))));
create trigger reject_banned_actor before insert or update on public.season_squads
  for each row execute function public._reject_banned_actor();
create trigger reject_banned_actor before insert or update on public.season_runs
  for each row execute function public._reject_banned_actor();

-- -----------------------------------------------------------------------------
-- Outils
-- -----------------------------------------------------------------------------
-- Collectif d'une formation pour des cartes placées { poste: modèle } (mêmes règles que le Draft)
create function public._formation_chemistry(p_formation text, p_picks jsonb)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  with l as (
    select x.value ->> 0 as a, x.value ->> 1 as b
    from public.draft_formations f, jsonb_array_elements(f.links) x where f.code = p_formation
  ), colored as (
    select l.a, l.b, public._draft_link((p_picks ->> l.a)::int, (p_picks ->> l.b)::int) as c
    from l where p_picks ? l.a and p_picks ? l.b
  ), per_player as (
    select slot, round(10 * avg(c) / 2.0) as chem
    from (select a as slot, c from colored union all select b, c from colored) s
    group by slot
  )
  select least(100, coalesce(sum(chem), 0))::smallint from per_player;
$$;

-- Force de l'équipe enregistrée du joueur (null si incomplète ou cartes plus possédées)
create function public._season_team(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.season_squads%rowtype;
  v_picks jsonb := '{}';
  v_rating numeric;
  v_chem smallint;
  v_owned int;
begin
  select * into s from public.season_squads where user_id = p_user;
  if not found then
    return null;
  end if;

  select count(*), avg(case when p.position::text = slot.value ->> 'pos' then ct.rating else ct.rating - 15 end),
         jsonb_object_agg(slot.value ->> 'key', ci.template_id)
  into v_owned, v_rating, v_picks
  from public.draft_formations f
  cross join jsonb_array_elements(f.slots) slot
  join public.card_instances ci on ci.id = (s.slots ->> (slot.value ->> 'key'))::uuid and ci.owner_id = p_user
  join public.card_templates ct on ct.id = ci.template_id
  join public.players p on p.id = ct.player_id
  where f.code = s.formation;

  if v_owned <> 11 then
    return jsonb_build_object('complete', false, 'owned', v_owned);
  end if;
  v_chem := public._formation_chemistry(s.formation, v_picks);
  return jsonb_build_object('complete', true, 'rating', round(v_rating, 1), 'chemistry', v_chem,
                            'strength', round(v_rating + v_chem / 10.0, 1));
end;
$$;

-- Tirage de Poisson (algorithme de Knuth)
create function public._poisson(p_lambda numeric)
returns smallint
language plpgsql
volatile
set search_path = ''
as $$
declare
  l double precision := exp(-p_lambda);
  k int := 0;
  p double precision := 1;
begin
  loop
    p := p * random();
    exit when p <= l or k >= 9;
    k := k + 1;
  end loop;
  return k;
end;
$$;

-- Tactique de l'ordinateur : au hasard, ou (1 fois sur 2) celle qui bat la tactique favorite du joueur
create function public._season_ai_tactic(p_run uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_fav text;
begin
  select t into v_fav from (
    select tactic1 as t from public.season_fixtures where run_id = p_run and tactic1 is not null
    union all
    select tactic2 from public.season_fixtures where run_id = p_run and tactic2 is not null
  ) s group by t order by count(*) desc, random() limit 1;
  if v_fav is not null and random() < 0.5 then
    return case v_fav when 'pressing' then 'contre' when 'possession' then 'pressing' else 'possession' end;
  end if;
  return (array['pressing', 'possession', 'contre'])[1 + floor(random() * 3)::int];
end;
$$;

-- Buts d'une mi-temps : (joueur, adversaire)
create function public._season_half(p_team numeric, p_opp numeric, p_tactic text, p_opp_tactic text)
returns smallint[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_win boolean := (p_tactic, p_opp_tactic) in (('pressing', 'possession'), ('possession', 'contre'), ('contre', 'pressing'));
  v_lose boolean := (p_opp_tactic, p_tactic) in (('pressing', 'possession'), ('possession', 'contre'), ('contre', 'pressing'));
  f_p numeric := case when v_win then 1.35 when v_lose then 0.8 else 1 end;
  f_o numeric := case when v_lose then 1.35 when v_win then 0.8 else 1 end;
begin
  return array[
    -- moyenne de buts par mi-temps bornée (0,15 à 1,5) : pas de scores irréalistes entre équipes très inégales
    public._poisson(least(1.5, greatest(0.15, 0.7 * exp((p_team - p_opp) / 14.0) * f_p))),
    public._poisson(least(1.5, greatest(0.15, 0.7 * exp((p_opp - p_team) / 14.0) * f_o)))];
end;
$$;

-- Division de la prochaine saison : montée après 18 points ou plus, descente sous 9 points
-- (d'après la dernière saison terminée ; une saison abandonnée ne compte pas)
create function public._season_next_tier(p_user uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $f$
  select coalesce((
    select case when r.points >= 18 then least(5, r.tier + 1) when r.points < 9 then greatest(0, r.tier - 1) else r.tier end
    from public.season_runs r where r.user_id = p_user and r.status = 'finished' order by r.finished_at desc limit 1), 0)::smallint;
$f$;

create function public._season_state(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'squad', (select jsonb_build_object('formation', formation, 'slots', slots) from public.season_squads where user_id = p_user),
    'team', public._season_team(p_user),
    'run', (select jsonb_build_object(
              'id', r.id, 'number', r.number, 'tier', r.tier, 'status', r.status, 'matchday', r.matchday,
              'points', r.points, 'wins', r.wins, 'draws', r.draws, 'losses', r.losses,
              'goals_for', r.goals_for, 'goals_against', r.goals_against, 'rewards_given', to_jsonb(r.rewards_given),
              'fixtures', (select jsonb_agg(jsonb_build_object(
                             'matchday', f.matchday, 'club', f.opponent_club_id, 'opp_strength', f.opp_strength,
                             'team_strength', f.team_strength, 'status', f.status,
                             'tactic1', f.tactic1, 'opp_tactic1', f.opp_tactic1, 'tactic2', f.tactic2, 'opp_tactic2', f.opp_tactic2,
                             'goals1', f.goals1, 'opp_goals1', f.opp_goals1, 'goals2', f.goals2, 'opp_goals2', f.opp_goals2)
                             order by f.matchday)
                           from public.season_fixtures f where f.run_id = r.id))
            from public.season_runs r where r.user_id = p_user order by r.created_at desc limit 1),
    'played_today', (select count(*) from public.season_fixtures f join public.season_runs r on r.id = f.run_id
                     where r.user_id = p_user
                       and (f.started_at at time zone public._game_timezone())::date = (now() at time zone public._game_timezone())::date),
    'daily_limit', coalesce((public.get_setting('season_daily_matches'))::int, 3),
    'rewards', coalesce(public.get_setting('season_rewards'), '[]'),
    'seasons_finished', (select count(*) from public.season_runs where user_id = p_user and status = 'finished'),
    'next_tier', public._season_next_tier(p_user));
$$;

revoke execute on function public._formation_chemistry(text, jsonb) from public, anon, authenticated;
revoke execute on function public._season_team(uuid) from public, anon, authenticated;
revoke execute on function public._poisson(numeric) from public, anon, authenticated;
revoke execute on function public._season_ai_tactic(uuid) from public, anon, authenticated;
revoke execute on function public._season_half(numeric, numeric, text, text) from public, anon, authenticated;
revoke execute on function public._season_state(uuid) from public, anon, authenticated;
revoke execute on function public._season_next_tier(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------
create function public.season_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  return public._season_state(auth.uid());
end;
$$;

-- Enregistre l'onze : 11 exemplaires possédés, 11 footballeurs différents
create function public.set_season_squad(p_formation text, p_slots jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  f public.draft_formations%rowtype;
  v_ids uuid[];
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  select * into f from public.draft_formations where code = p_formation;
  if not found then
    raise exception 'Formation inconnue' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.season_runs r join public.season_fixtures x on x.run_id = r.id
             where r.user_id = v_uid and r.status = 'active' and x.status = 'half') then
    raise exception 'Termine d''abord le match en cours' using errcode = 'P0001';
  end if;

  select array_agg((p_slots ->> (s.value ->> 'key'))::uuid) into v_ids
  from jsonb_array_elements(f.slots) s;
  if v_ids is null or array_position(v_ids, null) is not null or (select count(distinct x) from unnest(v_ids) x) <> 11 then
    raise exception 'Place 11 cartes différentes, une par poste' using errcode = 'P0001';
  end if;
  if (select count(*) from public.card_instances where id = any (v_ids) and owner_id = v_uid) <> 11 then
    raise exception 'Toutes les cartes doivent venir de ta collection' using errcode = 'P0001';
  end if;
  if (select count(distinct ct.player_id) from public.card_instances ci join public.card_templates ct on ct.id = ci.template_id
      where ci.id = any (v_ids)) <> 11 then
    raise exception 'Un même footballeur ne peut jouer qu''une fois' using errcode = 'P0001';
  end if;

  insert into public.season_squads (user_id, formation, slots, updated_at)
  values (v_uid, f.code, (select jsonb_object_agg(s.value ->> 'key', p_slots ->> (s.value ->> 'key')) from jsonb_array_elements(f.slots) s), now())
  on conflict (user_id) do update set formation = excluded.formation, slots = excluded.slots, updated_at = now();
  return public._season_state(v_uid);
end;
$$;

create function public.start_season()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_number int;
  v_tier smallint;
  v_run uuid;
  v_team jsonb;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  if exists (select 1 from public.season_runs where user_id = v_uid and status = 'active') then
    raise exception 'Une saison est déjà en cours' using errcode = 'P0001';
  end if;
  v_team := public._season_team(v_uid);
  if v_team is null or not (v_team ->> 'complete')::boolean then
    raise exception 'Compose d''abord ton onze' using errcode = 'P0001';
  end if;

  select count(*) + 1 into v_number from public.season_runs where user_id = v_uid;
  v_tier := public._season_next_tier(v_uid);

  insert into public.season_runs (user_id, number, tier) values (v_uid, v_number, v_tier) returning id into v_run;
  -- 10 adversaires : clubs différents, de plus en plus forts au fil de la saison
  insert into public.season_fixtures (run_id, matchday, opponent_club_id, opp_strength)
  select v_run, row_number() over (order by r), id,
         round(74 + 2 * v_tier + 0.6 * row_number() over (order by r) + (random() * 4 - 2)::numeric, 1)
  from (select c.id, random() as r from public.clubs c
        where exists (select 1 from public.card_templates ct where ct.club_id = c.id)
        order by random() limit 10) s;
  return public._season_state(v_uid);
end;
$$;

-- Joue une mi-temps du match du jour avec la tactique choisie
create function public.season_play_half(p_tactic text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  r public.season_runs%rowtype;
  fx public.season_fixtures%rowtype;
  v_team jsonb;
  v_opp_tactic text;
  v_goals smallint[];
  v_total int;
  v_opp_total int;
  v_points int;
  v_rewards jsonb := coalesce(public.get_setting('season_rewards'), '[]');
  v_reward jsonb;
  v_limit int := coalesce((public.get_setting('season_daily_matches'))::int, 3);
  v_tz text := public._game_timezone();
begin
  if p_tactic is null or p_tactic not in ('pressing', 'possession', 'contre') then
    raise exception 'Tactique inconnue' using errcode = 'P0001';
  end if;
  select * into r from public.season_runs where user_id = v_uid and status = 'active' for update;
  if not found then
    raise exception 'Aucune saison en cours' using errcode = 'P0001';
  end if;
  select * into fx from public.season_fixtures where run_id = r.id and matchday = r.matchday for update;

  if fx.status = 'scheduled' then
    if (select count(*) from public.season_fixtures f join public.season_runs sr on sr.id = f.run_id
        where sr.user_id = v_uid and (f.started_at at time zone v_tz)::date = (now() at time zone v_tz)::date) >= v_limit then
      raise exception 'Tes joueurs récupèrent : reviens demain pour le prochain match !' using errcode = 'P0001';
    end if;
    v_team := public._season_team(v_uid);
    if v_team is null or not (v_team ->> 'complete')::boolean then
      raise exception 'Ton onze est incomplet (cartes vendues ou échangées) : recompose-le' using errcode = 'P0001';
    end if;
    v_opp_tactic := public._season_ai_tactic(r.id);
    v_goals := public._season_half((v_team ->> 'strength')::numeric, fx.opp_strength, p_tactic, v_opp_tactic);
    update public.season_fixtures
    set status = 'half', team_strength = (v_team ->> 'strength')::numeric, tactic1 = p_tactic, opp_tactic1 = v_opp_tactic,
        goals1 = v_goals[1], opp_goals1 = v_goals[2], started_at = now()
    where run_id = r.id and matchday = fx.matchday;
    return public._season_state(v_uid);
  end if;

  -- Seconde mi-temps : fin du match
  v_opp_tactic := public._season_ai_tactic(r.id);
  v_goals := public._season_half(fx.team_strength, fx.opp_strength, p_tactic, v_opp_tactic);
  update public.season_fixtures
  set status = 'played', tactic2 = p_tactic, opp_tactic2 = v_opp_tactic, goals2 = v_goals[1], opp_goals2 = v_goals[2],
      played_at = now()
  where run_id = r.id and matchday = fx.matchday;

  v_total := fx.goals1 + v_goals[1];
  v_opp_total := fx.opp_goals1 + v_goals[2];
  v_points := case when v_total > v_opp_total then 3 when v_total = v_opp_total then 1 else 0 end;
  update public.season_runs
  set points = points + v_points,
      wins = wins + (v_points = 3)::int, draws = draws + (v_points = 1)::int, losses = losses + (v_points = 0)::int,
      goals_for = goals_for + v_total, goals_against = goals_against + v_opp_total,
      matchday = matchday + 1,
      status = case when matchday + 1 > 10 then 'finished' else status end,
      finished_at = case when matchday + 1 > 10 then now() end
  where id = r.id
  returning * into r;

  -- Paliers atteints
  for v_reward in select value from jsonb_array_elements(v_rewards) loop
    if r.points >= (v_reward ->> 'points')::int and not ((v_reward ->> 'points')::smallint = any (r.rewards_given)) then
      update public.season_runs set rewards_given = rewards_given || (v_reward ->> 'points')::smallint where id = r.id
      returning * into r;
      -- Dernier palier : un pack de plus par tranche de 2 divisions (récompense la montée)
      perform public._grant_boosters(v_uid, v_reward ->> 'booster',
        (v_reward ->> 'count')::int
          + case when (v_reward ->> 'points')::int = (select max((x ->> 'points')::int) from jsonb_array_elements(v_rewards) x)
                 then r.tier / 2 else 0 end,
        'Saison ' || r.number || ' : palier de ' || (v_reward ->> 'points') || ' points');
    end if;
  end loop;

  if r.status = 'finished' then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_uid, 'season', 'Saison ' || r.number || ' terminée',
            r.points || ' points (' || r.wins || ' V, ' || r.draws || ' N, ' || r.losses || ' D)', '/saison');
  end if;
  return public._season_state(v_uid);
end;
$$;

-- Abandon de la saison en cours (les paliers déjà gagnés restent acquis)
create function public.abandon_season()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.season_runs set status = 'abandoned', finished_at = now()
  where user_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'Aucune saison en cours' using errcode = 'P0001';
  end if;
  return public._season_state(auth.uid());
end;
$$;

revoke execute on function public.season_status() from public, anon;
revoke execute on function public.set_season_squad(text, jsonb) from public, anon;
revoke execute on function public.start_season() from public, anon;
revoke execute on function public.season_play_half(text) from public, anon;
revoke execute on function public.abandon_season() from public, anon;
grant execute on function public.season_status() to authenticated;
grant execute on function public.set_season_squad(text, jsonb) to authenticated;
grant execute on function public.start_season() to authenticated;
grant execute on function public.season_play_half(text) to authenticated;
grant execute on function public.abandon_season() to authenticated;
