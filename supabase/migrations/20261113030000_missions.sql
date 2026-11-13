-- =============================================================================
-- Missions quotidiennes et hebdomadaires → jetons → packs (boutique à jetons).
-- La progression est comptée par des déclencheurs sur les tables de jeu (aucune action client).
-- =============================================================================

alter table public.profiles add column tokens int not null default 0 check (tokens >= 0);

insert into public.app_settings (key, value, description) values
  ('token_shop', '[{"booster": "standard", "cost": 100}, {"booster": "premium", "cost": 250}]',
   'Boutique à jetons : packs échangeables contre les jetons des missions')
on conflict (key) do nothing;

create table public.missions (
  id smallint generated always as identity primary key,
  slug text not null unique,
  period text not null check (period in ('daily', 'weekly')),
  title text not null,
  event text not null,
  target smallint not null check (target > 0),
  tokens smallint not null check (tokens > 0),
  link text,
  is_active boolean not null default true,
  sort_order smallint not null default 0
);

create table public.mission_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id smallint not null references public.missions (id) on delete cascade,
  period_start date not null,
  progress smallint not null default 0,
  claimed_at timestamptz,
  primary key (user_id, mission_id, period_start)
);

create table public.token_purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  booster text not null,
  cost int not null check (cost > 0),
  created_at timestamptz not null default now()
);

alter table public.missions enable row level security;
alter table public.mission_progress enable row level security;
alter table public.token_purchases enable row level security;
grant select on public.missions, public.mission_progress, public.token_purchases to authenticated;
create policy "Lecture" on public.missions for select to authenticated using (true);
create policy "Ma progression" on public.mission_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Mes achats" on public.token_purchases for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create trigger reject_banned_actor before update on public.mission_progress
  for each row execute function public._reject_banned_actor();
create trigger reject_banned_actor before insert on public.token_purchases
  for each row execute function public._reject_banned_actor();

insert into public.missions (slug, period, title, event, target, tokens, link, sort_order) values
  ('bonus',            'daily',  'Récupère ton bonus quotidien',             'daily_bonus',    1, 5,  '/',        1),
  ('ouvrir-2',         'daily',  'Ouvre 2 boosters',                         'open_booster',   2, 10, '/boosters', 2),
  ('match-saison',     'daily',  'Joue un match de saison',                  'season_play',    1, 10, '/saison',  3),
  ('draft-jour',       'daily',  'Termine un draft',                         'draft_complete', 1, 10, '/draft',   4),
  ('penalty-jour',     'daily',  'Dispute un tournoi de tirs au but',        'penalty_play',   1, 10, '/penalty', 5),
  ('saison-5',         'weekly', 'Gagne 5 matchs de saison',                 'season_win',     5, 50, '/saison',  10),
  ('defis-2',          'weekly', 'Réussis 2 défis d''équipe',                'sbc_complete',   2, 40, '/defis',   11),
  ('penalty-victoire', 'weekly', 'Gagne un tournoi de tirs au but',          'penalty_win',    1, 40, '/penalty', 12),
  ('draft-collectif',  'weekly', 'Termine un draft avec un collectif ≥ 50',  'draft_chem50',   1, 30, '/draft',   13),
  ('marche-3',         'weekly', 'Vends 3 cartes au marché',                 'market_sell',    3, 30, '/marche',  14);

-- -----------------------------------------------------------------------------
-- Comptage des événements
-- -----------------------------------------------------------------------------
create function public._mission_event(p_user uuid, p_event text, p_amount int default 1)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.mission_progress (user_id, mission_id, period_start, progress)
  select p_user, m.id, public._period_start(m.period), least(m.target, p_amount)
  from public.missions m
  where m.is_active and m.event = p_event and p_user is not null
  on conflict (user_id, mission_id, period_start) do update
  set progress = least((select target from public.missions where id = excluded.mission_id),
                       public.mission_progress.progress + p_amount);
$$;
revoke execute on function public._mission_event(uuid, text, int) from public, anon, authenticated;

create function public._missions_on_opening() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._mission_event(new.user_id, 'open_booster');
  return new;
end; $$;
create trigger missions_count after insert on public.booster_openings
  for each row execute function public._missions_on_opening();

create function public._missions_on_coins() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'daily_bonus' then
    perform public._mission_event(new.user_id, 'daily_bonus');
  end if;
  return new;
end; $$;
create trigger missions_count after insert on public.coin_transactions
  for each row execute function public._missions_on_coins();

create function public._missions_on_draft() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'picking' and new.status = 'completed' then
    perform public._mission_event(new.user_id, 'draft_complete');
    if new.chemistry >= 50 then
      perform public._mission_event(new.user_id, 'draft_chem50');
    end if;
  end if;
  return new;
end; $$;
create trigger missions_count after update of status on public.drafts
  for each row execute function public._missions_on_draft();

create function public._missions_on_penalty() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'playing' and new.status <> 'playing' then
    perform public._mission_event(new.user_id, 'penalty_play');
    if new.status = 'won' then
      perform public._mission_event(new.user_id, 'penalty_win');
    end if;
  end if;
  return new;
end; $$;
create trigger missions_count after update of status on public.penalty_tournaments
  for each row execute function public._missions_on_penalty();

create function public._missions_on_sale() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._mission_event(new.seller_id, 'market_sell');
  return new;
end; $$;
create trigger missions_count after insert on public.market_sales
  for each row execute function public._missions_on_sale();

create function public._missions_on_sbc() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._mission_event(new.user_id, 'sbc_complete');
  return new;
end; $$;
create trigger missions_count after insert on public.sbc_completions
  for each row execute function public._missions_on_sbc();

create function public._missions_on_fixture() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if old.status <> 'played' and new.status = 'played' then
    select user_id into v_user from public.season_runs where id = new.run_id;
    perform public._mission_event(v_user, 'season_play');
    if new.goals1 + new.goals2 > new.opp_goals1 + new.opp_goals2 then
      perform public._mission_event(v_user, 'season_win');
    end if;
  end if;
  return new;
end; $$;
create trigger missions_count after update of status on public.season_fixtures
  for each row execute function public._missions_on_fixture();

do $$
declare
  f text;
begin
  foreach f in array array['_missions_on_opening', '_missions_on_coins', '_missions_on_draft', '_missions_on_penalty',
                           '_missions_on_sale', '_missions_on_sbc', '_missions_on_fixture']
  loop
    execute format('revoke execute on function public.%I() from public, anon, authenticated', f);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------
create function public.missions_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'tokens', (select tokens from public.profiles where id = auth.uid()),
    'shop', coalesce((select jsonb_agg(s.value || jsonb_build_object('name', b.name))
                      from jsonb_array_elements(coalesce(public.get_setting('token_shop'), '[]')) s
                      join public.boosters b on b.slug = s.value ->> 'booster' and b.is_active), '[]'),
    'missions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'period', m.period, 'title', m.title, 'target', m.target, 'tokens', m.tokens, 'link', m.link,
        'progress', coalesce(p.progress, 0), 'claimed', p.claimed_at is not null) order by m.sort_order)
      from public.missions m
      left join public.mission_progress p
        on p.mission_id = m.id and p.user_id = auth.uid() and p.period_start = public._period_start(m.period)
      where m.is_active), '[]'),
    'daily_reset', ((now() at time zone public._game_timezone())::date + 1)::text,
    'weekly_reset', (date_trunc('week', now() at time zone public._game_timezone())::date + 7)::text);
$$;

create function public.claim_mission(p_mission_id smallint)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.missions%rowtype;
  p public.mission_progress%rowtype;
begin
  select * into m from public.missions where id = p_mission_id and is_active;
  if not found then
    raise exception 'Mission introuvable' using errcode = 'P0001';
  end if;
  select * into p from public.mission_progress
  where user_id = v_uid and mission_id = m.id and period_start = public._period_start(m.period)
  for update;
  if not found or p.progress < m.target then
    raise exception 'Mission pas encore accomplie' using errcode = 'P0001';
  end if;
  if p.claimed_at is not null then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001';
  end if;
  update public.mission_progress set claimed_at = now()
  where user_id = v_uid and mission_id = m.id and period_start = p.period_start;
  update public.profiles set tokens = tokens + m.tokens where id = v_uid;
  return (select tokens from public.profiles where id = v_uid);
end;
$$;

create function public.buy_with_tokens(p_booster text)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cost int;
  v_tokens int;
begin
  select (s.value ->> 'cost')::int into v_cost
  from jsonb_array_elements(coalesce(public.get_setting('token_shop'), '[]')) s
  where s.value ->> 'booster' = p_booster;
  if v_cost is null then
    raise exception 'Article introuvable' using errcode = 'P0001';
  end if;
  select tokens into v_tokens from public.profiles where id = v_uid for update;
  if v_tokens is null or v_tokens < v_cost then
    raise exception 'Pas assez de jetons' using errcode = 'P0001';
  end if;
  update public.profiles set tokens = tokens - v_cost where id = v_uid;
  insert into public.token_purchases (user_id, booster, cost) values (v_uid, p_booster, v_cost);
  perform public._grant_boosters(v_uid, p_booster, 1, 'Échangé contre ' || v_cost || ' jetons');
  return v_tokens - v_cost;
end;
$$;

revoke execute on function public.missions_status() from public, anon;
revoke execute on function public.claim_mission(smallint) from public, anon;
revoke execute on function public.buy_with_tokens(text) from public, anon;
grant execute on function public.missions_status() to authenticated;
grant execute on function public.claim_mission(smallint) to authenticated;
grant execute on function public.buy_with_tokens(text) to authenticated;
