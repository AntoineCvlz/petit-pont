-- =============================================================================
-- Mode Draft
--   - Le joueur choisit une formation, puis, poste par poste, une carte parmi 5 tirées au hasard dans
--     tout le catalogue (cartes non possédées, non conservées).
--   - Collectif (« liens ») entre postes voisins, à l'ancienne :
--       vert   = même club, ou même ligue ET même nation
--       orange = même ligue OU même nation
--       rouge  = rien en commun
--   - Score = note d'équipe (moyenne des 11) + collectif / 20 (0 à 100 → jusqu'à +5).
--   - Gratuit, limité par jour (réglage draft_daily_limit), classement all-time (meilleur score).
-- Tout le tirage et le calcul se font ici : le client ne choisit que l'index de la carte proposée.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ligues
-- -----------------------------------------------------------------------------
create table public.leagues (
  id smallint generated always as identity primary key,
  code text not null unique,
  name text not null,
  short_name text not null,
  nation_id smallint references public.nations (id),
  sort_order smallint not null default 0
);
alter table public.leagues enable row level security;
create policy "Lecture publique" on public.leagues for select to anon, authenticated using (true);
grant select on public.leagues to anon, authenticated;

alter table public.clubs add column league_id smallint references public.leagues (id);
create index clubs_league_idx on public.clubs (league_id);

insert into public.leagues (code, name, short_name, sort_order) values
  ('L1',  'Ligue 1',                 'Ligue 1',     1),
  ('PL',  'Premier League',          'Premier L.',  2),
  ('LL',  'LaLiga',                  'LaLiga',      3),
  ('SA',  'Serie A',                 'Serie A',     4),
  ('BL',  'Bundesliga',              'Bundesliga',  5),
  ('SPL', 'Saudi Pro League',        'Saudi PL',    6),
  ('MLS', 'Major League Soccer',     'MLS',         7),
  ('SL',  'Süper Lig',               'Süper Lig',   8),
  ('ERE', 'Eredivisie',              'Eredivisie',  9),
  ('L2',  'Ligue 2',                 'Ligue 2',     10),
  ('N2',  'National 2',              'National 2',  11),
  ('BRA', 'Brasileirão',             'Brasileirão', 12),
  ('ARG', 'Liga Profesional',        'Liga Prof.',  13),
  ('AUT', 'Bundesliga autrichienne', 'Bundesliga AT', 14),
  ('QSL', 'Qatar Stars League',      'QSL',         15);

update public.leagues l set nation_id = n.id
from (values ('L1','FRA'), ('L2','FRA'), ('N2','FRA'), ('PL','ENG'), ('LL','ESP'), ('SA','ITA'), ('BL','GER'),
             ('SL','TUR'), ('ERE','NED'), ('BRA','BRA'), ('ARG','ARG')) as v(league, nation)
join public.nations n on n.code = v.nation
where l.code = v.league;

-- Ligue actuelle de chaque club (Wikidata P118, recoupé avec Wikipédia, novembre 2026).
-- Fonction partagée par cette migration (base existante) et le seed (base neuve).
create function public._club_league_code(p_club_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_club_code in ('PSG', 'OM', 'OL', 'ASM') then 'L1'
    when p_club_code = 'ASSE' then 'L2'
    when p_club_code = 'BOR' then 'N2'
    when p_club_code in ('MCI', 'LIV', 'ARS', 'CHE', 'MUN', 'BHA', 'CRY', 'NEW', 'TOT') then 'PL'
    when p_club_code in ('RMA', 'FCB', 'ATM', 'ATH', 'RSO', 'DEP') then 'LL'
    when p_club_code in ('INT', 'ACM', 'JUV', 'NAP', 'ATA', 'ROM') then 'SA'
    when p_club_code in ('FCBY', 'BVB', 'RBL') then 'BL'
    when p_club_code in ('NAS', 'HIL', 'AHL', 'ITT') then 'SPL'
    when p_club_code in ('MIA', 'LAFC', 'CHI', 'ORL') then 'MLS'
    when p_club_code in ('GAL', 'TRA', 'FEN', 'BJK') then 'SL'
    when p_club_code in ('AJX', 'PSV') then 'ERE'
    when p_club_code = 'SAN' then 'BRA'
    when p_club_code = 'BOC' then 'ARG'
    when p_club_code = 'SAL' then 'AUT'
    when p_club_code = 'SHA' then 'QSL'
  end;
$$;

update public.clubs c set league_id = l.id
from public.leagues l
where l.code = public._club_league_code(c.code);

-- -----------------------------------------------------------------------------
-- Formations : postes (x, y en % du terrain, y = 0 en haut côté attaque) et liens entre voisins
-- -----------------------------------------------------------------------------
create table public.draft_formations (
  code text primary key,
  name text not null,
  slots jsonb not null,  -- [{ "key": "BU", "label": "BU", "pos": "ATT", "x": 50, "y": 12 }, …] (11 postes, GB en premier)
  links jsonb not null,  -- [["GB","DCG"], …]
  sort_order smallint not null default 0
);
alter table public.draft_formations enable row level security;
create policy "Lecture publique" on public.draft_formations for select to authenticated using (true);
grant select on public.draft_formations to authenticated;

insert into public.draft_formations (code, name, sort_order, slots, links) values
('433', '4-3-3', 1,
 '[{"key":"GB","label":"GB","pos":"GB","x":50,"y":90},
   {"key":"DG","label":"DG","pos":"DEF","x":13,"y":68},{"key":"DCG","label":"DC","pos":"DEF","x":37,"y":73},
   {"key":"DCD","label":"DC","pos":"DEF","x":63,"y":73},{"key":"DD","label":"DD","pos":"DEF","x":87,"y":68},
   {"key":"MCG","label":"MC","pos":"MIL","x":24,"y":45},{"key":"MC","label":"MC","pos":"MIL","x":50,"y":50},
   {"key":"MCD","label":"MC","pos":"MIL","x":76,"y":45},
   {"key":"AG","label":"AG","pos":"ATT","x":16,"y":18},{"key":"BU","label":"BU","pos":"ATT","x":50,"y":12},
   {"key":"AD","label":"AD","pos":"ATT","x":84,"y":18}]',
 '[["GB","DCG"],["GB","DCD"],["DG","DCG"],["DCG","DCD"],["DCD","DD"],["DG","MCG"],["DCG","MC"],["DCD","MC"],["DD","MCD"],
   ["MCG","MC"],["MC","MCD"],["MCG","AG"],["MC","BU"],["MCD","AD"],["AG","BU"],["BU","AD"]]'),
('442', '4-4-2', 2,
 '[{"key":"GB","label":"GB","pos":"GB","x":50,"y":90},
   {"key":"DG","label":"DG","pos":"DEF","x":13,"y":68},{"key":"DCG","label":"DC","pos":"DEF","x":37,"y":73},
   {"key":"DCD","label":"DC","pos":"DEF","x":63,"y":73},{"key":"DD","label":"DD","pos":"DEF","x":87,"y":68},
   {"key":"MG","label":"MG","pos":"MIL","x":13,"y":40},{"key":"MCG","label":"MC","pos":"MIL","x":37,"y":46},
   {"key":"MCD","label":"MC","pos":"MIL","x":63,"y":46},{"key":"MD","label":"MD","pos":"MIL","x":87,"y":40},
   {"key":"BUG","label":"BU","pos":"ATT","x":36,"y":14},{"key":"BUD","label":"BU","pos":"ATT","x":64,"y":14}]',
 '[["GB","DCG"],["GB","DCD"],["DG","DCG"],["DCG","DCD"],["DCD","DD"],["DG","MG"],["DCG","MCG"],["DCD","MCD"],["DD","MD"],
   ["MG","MCG"],["MCG","MCD"],["MCD","MD"],["MG","BUG"],["MCG","BUG"],["MCD","BUD"],["MD","BUD"],["BUG","BUD"]]'),
('4231', '4-2-3-1', 3,
 '[{"key":"GB","label":"GB","pos":"GB","x":50,"y":90},
   {"key":"DG","label":"DG","pos":"DEF","x":13,"y":68},{"key":"DCG","label":"DC","pos":"DEF","x":37,"y":73},
   {"key":"DCD","label":"DC","pos":"DEF","x":63,"y":73},{"key":"DD","label":"DD","pos":"DEF","x":87,"y":68},
   {"key":"MDCG","label":"MDC","pos":"MIL","x":36,"y":53},{"key":"MDCD","label":"MDC","pos":"MIL","x":64,"y":53},
   {"key":"MG","label":"MG","pos":"MIL","x":15,"y":30},{"key":"MOC","label":"MOC","pos":"MIL","x":50,"y":32},
   {"key":"MD","label":"MD","pos":"MIL","x":85,"y":30},
   {"key":"BU","label":"BU","pos":"ATT","x":50,"y":10}]',
 '[["GB","DCG"],["GB","DCD"],["DG","DCG"],["DCG","DCD"],["DCD","DD"],["DG","MG"],["DD","MD"],["DCG","MDCG"],["DCD","MDCD"],
   ["MDCG","MDCD"],["MDCG","MOC"],["MDCD","MOC"],["MDCG","MG"],["MDCD","MD"],["MG","MOC"],["MOC","MD"],["MOC","BU"],["MG","BU"],["MD","BU"]]'),
('352', '3-5-2', 4,
 '[{"key":"GB","label":"GB","pos":"GB","x":50,"y":90},
   {"key":"DCG","label":"DC","pos":"DEF","x":27,"y":72},{"key":"DC","label":"DC","pos":"DEF","x":50,"y":75},
   {"key":"DCD","label":"DC","pos":"DEF","x":73,"y":72},
   {"key":"MG","label":"MG","pos":"MIL","x":10,"y":42},{"key":"MCG","label":"MC","pos":"MIL","x":32,"y":50},
   {"key":"MOC","label":"MOC","pos":"MIL","x":50,"y":34},{"key":"MCD","label":"MC","pos":"MIL","x":68,"y":50},
   {"key":"MD","label":"MD","pos":"MIL","x":90,"y":42},
   {"key":"BUG","label":"BU","pos":"ATT","x":36,"y":13},{"key":"BUD","label":"BU","pos":"ATT","x":64,"y":13}]',
 '[["GB","DCG"],["GB","DC"],["GB","DCD"],["DCG","DC"],["DC","DCD"],["DCG","MG"],["DCG","MCG"],["DC","MCG"],["DC","MCD"],["DCD","MCD"],["DCD","MD"],
   ["MG","MCG"],["MCG","MOC"],["MOC","MCD"],["MCD","MD"],["MG","BUG"],["MOC","BUG"],["MOC","BUD"],["MD","BUD"],["BUG","BUD"]]');

-- -----------------------------------------------------------------------------
-- Drafts
-- -----------------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('draft_daily_limit', '5', 'Nombre de drafts qu''un joueur peut lancer par jour (fuseau du jeu)')
on conflict (key) do nothing;

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  formation text not null references public.draft_formations (code),
  status text not null default 'picking' check (status in ('picking', 'completed', 'abandoned')),
  current_slot smallint not null default 0,      -- index du poste à pourvoir dans formation.slots
  offer int[] not null default '{}',             -- 5 cartes proposées pour ce poste
  rating numeric(4, 2),
  chemistry smallint check (chemistry between 0 and 100),
  score numeric(5, 2),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index drafts_one_active_per_user on public.drafts (user_id) where status = 'picking';
create index drafts_user_idx on public.drafts (user_id, created_at desc);
create index drafts_score_idx on public.drafts (score desc) where status = 'completed';

create table public.draft_picks (
  draft_id uuid not null references public.drafts (id) on delete cascade,
  slot_key text not null,
  slot_index smallint not null,
  template_id int not null references public.card_templates (id),
  primary key (draft_id, slot_key)
);

alter table public.drafts enable row level security;
alter table public.draft_picks enable row level security;
grant select on public.drafts, public.draft_picks to authenticated;
-- Ses drafts (y compris en cours) ; ceux des autres une fois terminés (consultation depuis le classement)
create policy "Mes drafts et drafts terminés" on public.drafts for select to authenticated
  using (user_id = (select auth.uid()) or status = 'completed');
create policy "Choix visibles avec le draft" on public.draft_picks for select to authenticated
  using (exists (select 1 from public.drafts d where d.id = draft_id
                 and (d.user_id = (select auth.uid()) or d.status = 'completed')));

-- Un joueur suspendu ne joue pas (cf. 20261112130000_admin_accounts.sql)
create trigger reject_banned_actor before insert or update on public.drafts
  for each row execute function public._reject_banned_actor();

-- -----------------------------------------------------------------------------
-- Tirage des 5 propositions : poste voulu, joueurs pas encore dans l'équipe, un seul exemplaire par
-- footballeur, tirage pondéré par rareté (échantillonnage pondéré sans remise).
-- -----------------------------------------------------------------------------
create function public._draft_offer(p_draft_id uuid, p_position public.player_position)
returns int[]
language sql
volatile
security definer
set search_path = ''
as $$
  with candidates as (
    select ct.id, ct.player_id,
           -ln(1 - random()) / case ct.rarity
             when 'commune' then 30 when 'rare' then 30 when 'epique' then 20
             when 'legendaire' then 10 when 'iconique' then 6 else 4 end as k
    from public.card_templates ct
    join public.players p on p.id = ct.player_id
    where ct.is_active and p.position = p_position
      and ct.player_id not in (
        select t.player_id from public.draft_picks dp join public.card_templates t on t.id = dp.template_id
        where dp.draft_id = p_draft_id)
  ), one_per_player as (
    select distinct on (player_id) id, k from candidates order by player_id, k
  )
  select coalesce(array_agg(id order by k), '{}') from (select id, k from one_per_player order by k limit 5) s;
$$;

-- Couleur d'un lien : 2 = vert, 1 = orange, 0 = rouge
create function public._draft_link(p_a int, p_b int)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when ca.id = cb.id then 2
    when ca.league_id = cb.league_id and pa.nation_id = pb.nation_id then 2
    when ca.league_id = cb.league_id or pa.nation_id = pb.nation_id then 1
    else 0 end::smallint
  from public.card_templates ta
  join public.players pa on pa.id = ta.player_id
  left join public.clubs ca on ca.id = ta.club_id
  cross join public.card_templates tb
  join public.players pb on pb.id = tb.player_id
  left join public.clubs cb on cb.id = tb.club_id
  where ta.id = p_a and tb.id = p_b;
$$;

-- Collectif : chaque joueur vaut round(10 × force moyenne de ses liens) (vert = 1, orange = 0,5, rouge = 0),
-- somme des 11 plafonnée à 100.
create function public._draft_chemistry(p_draft_id uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select f.links from public.drafts d join public.draft_formations f on f.code = d.formation where d.id = p_draft_id
  ), l as (
    select x.value ->> 0 as a, x.value ->> 1 as b from d, jsonb_array_elements(d.links) x
  ), colored as (
    select l.a, l.b, public._draft_link(pa.template_id, pb.template_id) as c
    from l
    join public.draft_picks pa on pa.draft_id = p_draft_id and pa.slot_key = l.a
    join public.draft_picks pb on pb.draft_id = p_draft_id and pb.slot_key = l.b
  ), per_player as (
    select slot, round(10 * avg(c) / 2.0) as chem
    from (select a as slot, c from colored union all select b, c from colored) s
    group by slot
  )
  select least(100, coalesce(sum(chem), 0))::smallint from per_player;
$$;

-- État renvoyé au client après chaque action
create function public._draft_state(p_draft_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id, 'formation', d.formation, 'status', d.status, 'current_slot', d.current_slot,
    'offer', to_jsonb(d.offer), 'rating', d.rating, 'chemistry', d.chemistry, 'score', d.score,
    'picks', coalesce((select jsonb_object_agg(slot_key, template_id) from public.draft_picks where draft_id = d.id), '{}'))
  from public.drafts d where d.id = p_draft_id;
$$;

revoke execute on function public._draft_offer(uuid, public.player_position) from public, anon, authenticated;
revoke execute on function public._draft_link(int, int) from public, anon, authenticated;
revoke execute on function public._draft_chemistry(uuid) from public, anon, authenticated;
revoke execute on function public._draft_state(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------
create function public.draft_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := public._game_timezone();
  v_limit int := coalesce((public.get_setting('draft_daily_limit'))::int, 5);
  v_used int;
  v_active uuid;
  v_best jsonb;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  select count(*) into v_used from public.drafts
  where user_id = v_uid and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date;
  select id into v_active from public.drafts where user_id = v_uid and status = 'picking';
  select jsonb_build_object('id', id, 'score', score, 'rating', rating, 'chemistry', chemistry) into v_best
  from public.drafts where user_id = v_uid and status = 'completed' order by score desc, completed_at limit 1;
  return jsonb_build_object(
    'daily_limit', v_limit, 'used_today', v_used, 'remaining', greatest(0, v_limit - v_used),
    'active', case when v_active is null then null else public._draft_state(v_active) end,
    'best', v_best);
end;
$$;

create function public.start_draft(p_formation text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := public._game_timezone();
  v_limit int := coalesce((public.get_setting('draft_daily_limit'))::int, 5);
  f public.draft_formations%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  -- Verrou du joueur : un seul draft lancé à la fois, limite quotidienne fiable
  perform 1 from public.profiles where id = v_uid for update;

  if exists (select 1 from public.drafts where user_id = v_uid and status = 'picking') then
    raise exception 'Termine (ou abandonne) ton draft en cours' using errcode = 'P0001';
  end if;
  if (select count(*) from public.drafts
      where user_id = v_uid and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date) >= v_limit then
    raise exception 'Plus de draft disponible aujourd''hui : reviens demain !' using errcode = 'P0001';
  end if;

  select * into f from public.draft_formations where code = p_formation;
  if not found then
    raise exception 'Formation inconnue' using errcode = 'P0001';
  end if;

  insert into public.drafts (user_id, formation) values (v_uid, f.code) returning id into v_id;
  update public.drafts
  set offer = public._draft_offer(v_id, (f.slots -> 0 ->> 'pos')::public.player_position)
  where id = v_id;
  return public._draft_state(v_id);
end;
$$;

create function public.draft_pick(p_draft_id uuid, p_choice int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  d public.drafts%rowtype;
  f public.draft_formations%rowtype;
  v_slot jsonb;
  v_next int;
  v_rating numeric;
  v_chem smallint;
begin
  select * into d from public.drafts where id = p_draft_id for update;
  if not found or d.user_id is distinct from v_uid then
    raise exception 'Draft introuvable' using errcode = 'P0001';
  end if;
  if d.status <> 'picking' then
    raise exception 'Ce draft est terminé' using errcode = 'P0001';
  end if;
  if p_choice is null or p_choice < 1 or p_choice > cardinality(d.offer) then
    raise exception 'Choix invalide' using errcode = 'P0001';
  end if;

  select * into f from public.draft_formations where code = d.formation;
  v_slot := f.slots -> d.current_slot;
  insert into public.draft_picks (draft_id, slot_key, slot_index, template_id)
  values (d.id, v_slot ->> 'key', d.current_slot, d.offer[p_choice]);

  v_next := d.current_slot + 1;
  if v_next < jsonb_array_length(f.slots) then
    update public.drafts
    set current_slot = v_next,
        offer = public._draft_offer(d.id, (f.slots -> v_next ->> 'pos')::public.player_position)
    where id = d.id;
  else
    select round(avg(ct.rating), 2) into v_rating
    from public.draft_picks dp join public.card_templates ct on ct.id = dp.template_id where dp.draft_id = d.id;
    v_chem := public._draft_chemistry(d.id);
    update public.drafts
    set status = 'completed', current_slot = v_next, offer = '{}', rating = v_rating, chemistry = v_chem,
        score = round(v_rating + v_chem / 20.0, 2), completed_at = now()
    where id = d.id;
  end if;
  return public._draft_state(d.id);
end;
$$;

create function public.abandon_draft(p_draft_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.drafts set status = 'abandoned', offer = '{}'
  where id = p_draft_id and user_id = auth.uid() and status = 'picking';
  if not found then
    raise exception 'Draft introuvable' using errcode = 'P0001';
  end if;
end;
$$;

-- Classement all-time : meilleur score de chaque joueur (comptes suspendus exclus)
create function public.draft_leaderboard(p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, avatar_url text, draft_id uuid, score numeric,
               rating numeric, chemistry smallint, formation text, completed_at timestamptz, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select distinct on (d.user_id) d.*
    from public.drafts d
    join public.profiles p on p.id = d.user_id
    where d.status = 'completed' and p.banned_at is null
    order by d.user_id, d.score desc, d.completed_at
  )
  select rank() over (order by b.score desc), b.user_id, p.username, p.avatar_url, b.id, b.score, b.rating,
         b.chemistry, b.formation, b.completed_at, b.user_id = auth.uid()
  from best b join public.profiles p on p.id = b.user_id
  order by b.score desc, b.completed_at
  limit least(greatest(p_limit, 1), 200);
$$;

revoke execute on function public.draft_status() from public, anon;
revoke execute on function public.start_draft(text) from public, anon;
revoke execute on function public.draft_pick(uuid, int) from public, anon;
revoke execute on function public.abandon_draft(uuid) from public, anon;
revoke execute on function public.draft_leaderboard(int) from public, anon;
grant execute on function public.draft_status() to authenticated;
grant execute on function public.start_draft(text) to authenticated;
grant execute on function public.draft_pick(uuid, int) to authenticated;
grant execute on function public.abandon_draft(uuid) to authenticated;
grant execute on function public.draft_leaderboard(int) to authenticated;
