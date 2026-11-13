-- =============================================================================
-- Défis d'équipe : le joueur sacrifie des cartes respectant des conditions et reçoit des packs
-- (inventaire « packs offerts », ouverts avec l'animation habituelle).
-- Les cartes envoyées sont détruites : les doublons retrouvent de la valeur et des cartes sortent du jeu.
-- =============================================================================

-- Packs attribués par le jeu (défis, saison, missions) : même inventaire que les cadeaux de l'équipe
create function public._grant_boosters(p_user uuid, p_booster_slug text, p_count int, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booster int;
  v_name text;
begin
  select id, name into v_booster, v_name from public.boosters where slug = p_booster_slug and is_active;
  if v_booster is null then
    raise exception 'Récompense indisponible (booster « % » désactivé)', p_booster_slug using errcode = 'P0001';
  end if;
  insert into public.booster_grants (user_id, booster_id, granted_by, reason)
  select p_user, v_booster, null, p_reason from generate_series(1, p_count);
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, 'reward',
          case when p_count = 1 then 'Pack gagné : ' || v_name else p_count || ' packs gagnés : ' || v_name end,
          p_reason, '/boosters');
end;
$$;
revoke execute on function public._grant_boosters(uuid, text, int, text) from public, anon, authenticated;

-- Début de la période (jour / semaine ISO) dans le fuseau du jeu
create function public._period_start(p_period text)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case p_period
    when 'weekly' then date_trunc('week', now() at time zone public._game_timezone())::date
    else (now() at time zone public._game_timezone())::date end;
$$;

create table public.sbc_challenges (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  requirements jsonb not null,                -- voir _sbc_check
  reward_booster text not null,               -- slug du booster
  reward_count smallint not null default 1 check (reward_count between 1 and 10),
  repeat text not null default 'once' check (repeat in ('once', 'daily', 'weekly', 'unlimited')),
  is_active boolean not null default true,
  sort_order smallint not null default 0
);

create table public.sbc_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id smallint not null references public.sbc_challenges (id) on delete cascade,
  cards_used int[] not null,                  -- modèles des cartes sacrifiées
  completed_at timestamptz not null default now()
);
create index sbc_completions_user_idx on public.sbc_completions (user_id, challenge_id, completed_at desc);

alter table public.sbc_challenges enable row level security;
alter table public.sbc_completions enable row level security;
grant select on public.sbc_challenges, public.sbc_completions to authenticated;
create policy "Lecture" on public.sbc_challenges for select to authenticated using (true);
create policy "Mes défis réussis" on public.sbc_completions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create trigger reject_banned_actor before insert on public.sbc_completions
  for each row execute function public._reject_banned_actor();

insert into public.sbc_challenges (slug, name, description, requirements, reward_booster, reward_count, repeat, sort_order) values
  ('vide-grenier', 'Vide-grenier', '5 cartes, n''importe lesquelles. Idéal pour tes doublons.',
   '{"count": 5}', 'gratuit', 1, 'daily', 1),
  ('onze-ligue-1', 'Onze de Ligue 1', '11 joueurs évoluant en Ligue 1.',
   '{"count": 11, "league": "L1"}', 'standard', 1, 'weekly', 2),
  ('tour-du-monde', 'Tour du monde', '7 cartes de 7 nations différentes.',
   '{"count": 7, "distinct_nations": 7}', 'standard', 1, 'weekly', 3),
  ('premier-league', 'Premier League', '11 joueurs de Premier League, note moyenne 80 ou plus.',
   '{"count": 11, "league": "PL", "min_avg_rating": 80}', 'standard', 2, 'weekly', 4),
  ('liga-de-luxe', 'LaLiga de luxe', '8 joueurs de LaLiga, note moyenne 83 ou plus.',
   '{"count": 8, "league": "LL", "min_avg_rating": 83}', 'premium', 1, 'weekly', 5),
  ('epiques', 'Épiques à la pelle', '3 cartes Épiques ou mieux.',
   '{"count": 3, "min_rarity": {"rarity": "epique", "count": 3}}', 'premium', 1, 'weekly', 6),
  ('legendes', 'Légende contre légende', '2 cartes Légendaires ou mieux.',
   '{"count": 2, "min_rarity": {"rarity": "legendaire", "count": 2}}', 'premium', 2, 'weekly', 7),
  ('les-bleus', 'Les Bleus', '11 joueurs de l''équipe de France, dont 2 Rares ou mieux.',
   '{"count": 11, "nation": "FRA", "min_rarity": {"rarity": "rare", "count": 2}}', 'premium', 1, 'once', 8);

-- Conditions possibles : count (exact), league / nation / club (toutes les cartes), min_avg_rating,
-- min_rarity {rarity, count} (au moins count cartes de cette rareté ou mieux), distinct_nations, distinct_clubs.
-- Renvoie null si la sélection convient, sinon le premier motif de refus.
create function public._sbc_check(p_requirements jsonb, p_templates int[])
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r jsonb := p_requirements;
  v_n int := cardinality(p_templates);
  v_bad int;
  v_val numeric;
begin
  if r ? 'count' and v_n <> (r ->> 'count')::int then
    return 'Il faut exactement ' || (r ->> 'count') || ' cartes';
  end if;

  if r ? 'league' then
    select count(*) into v_bad from unnest(p_templates) t(id)
    join public.card_templates ct on ct.id = t.id
    left join public.clubs c on c.id = ct.club_id
    left join public.leagues l on l.id = c.league_id
    where l.code is distinct from r ->> 'league';
    if v_bad > 0 then
      return 'Toutes les cartes doivent venir de ' || coalesce((select name from public.leagues where code = r ->> 'league'), r ->> 'league');
    end if;
  end if;

  if r ? 'nation' then
    select count(*) into v_bad from unnest(p_templates) t(id)
    join public.card_templates ct on ct.id = t.id
    join public.players p on p.id = ct.player_id
    join public.nations n on n.id = p.nation_id
    where n.code <> r ->> 'nation';
    if v_bad > 0 then
      return 'Tous les joueurs doivent être de nationalité ' || coalesce((select name from public.nations where code = r ->> 'nation'), r ->> 'nation');
    end if;
  end if;

  if r ? 'club' then
    select count(*) into v_bad from unnest(p_templates) t(id)
    join public.card_templates ct on ct.id = t.id
    left join public.clubs c on c.id = ct.club_id
    where c.code is distinct from r ->> 'club';
    if v_bad > 0 then
      return 'Tous les joueurs doivent venir du même club';
    end if;
  end if;

  if r ? 'min_avg_rating' then
    select avg(ct.rating) into v_val from unnest(p_templates) t(id) join public.card_templates ct on ct.id = t.id;
    if v_val < (r ->> 'min_avg_rating')::numeric then
      return 'Note moyenne insuffisante (' || round(v_val, 1) || ' pour ' || (r ->> 'min_avg_rating') || ' requis)';
    end if;
  end if;

  if r ? 'min_rarity' then
    select count(*) into v_val from unnest(p_templates) t(id) join public.card_templates ct on ct.id = t.id
    where public.rarity_rank(ct.rarity) >= public.rarity_rank((r -> 'min_rarity' ->> 'rarity')::public.rarity);
    if v_val < (r -> 'min_rarity' ->> 'count')::int then
      return 'Il faut au moins ' || (r -> 'min_rarity' ->> 'count') || ' cartes de rareté suffisante';
    end if;
  end if;

  if r ? 'distinct_nations' then
    select count(distinct p.nation_id) into v_val from unnest(p_templates) t(id)
    join public.card_templates ct on ct.id = t.id join public.players p on p.id = ct.player_id;
    if v_val < (r ->> 'distinct_nations')::int then
      return 'Il faut ' || (r ->> 'distinct_nations') || ' nations différentes';
    end if;
  end if;

  if r ? 'distinct_clubs' then
    select count(distinct ct.club_id) into v_val from unnest(p_templates) t(id) join public.card_templates ct on ct.id = t.id;
    if v_val < (r ->> 'distinct_clubs')::int then
      return 'Il faut ' || (r ->> 'distinct_clubs') || ' clubs différents';
    end if;
  end if;

  return null;
end;
$$;

-- Disponibilité d'un défi pour un joueur (selon sa fréquence de répétition)
create function public._sbc_available(p_user uuid, p_challenge public.sbc_challenges)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_challenge.repeat
    when 'unlimited' then true
    when 'once' then not exists (select 1 from public.sbc_completions where user_id = p_user and challenge_id = p_challenge.id)
    else not exists (
      select 1 from public.sbc_completions
      where user_id = p_user and challenge_id = p_challenge.id
        and (completed_at at time zone public._game_timezone())::date >= public._period_start(p_challenge.repeat))
  end;
$$;

revoke execute on function public._period_start(text) from public, anon;
revoke execute on function public._sbc_check(jsonb, int[]) from public, anon, authenticated;
revoke execute on function public._sbc_available(uuid, public.sbc_challenges) from public, anon, authenticated;

create function public.sbc_list()
returns table (id smallint, slug text, name text, description text, requirements jsonb, reward_booster text,
               reward_booster_name text, reward_count smallint, repeat text, available boolean, completions bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.slug, c.name, c.description, c.requirements, c.reward_booster, b.name, c.reward_count, c.repeat,
         public._sbc_available(auth.uid(), c),
         (select count(*) from public.sbc_completions s where s.user_id = auth.uid() and s.challenge_id = c.id)
  from public.sbc_challenges c
  left join public.boosters b on b.slug = c.reward_booster
  where c.is_active
  order by c.sort_order;
$$;

create function public.submit_sbc(p_challenge_id smallint, p_instance_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  c public.sbc_challenges%rowtype;
  v_templates int[];
  v_problem text;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where id = v_uid for update;

  select * into c from public.sbc_challenges where id = p_challenge_id and is_active;
  if not found then
    raise exception 'Défi introuvable' using errcode = 'P0001';
  end if;
  if not public._sbc_available(v_uid, c) then
    raise exception 'Défi déjà réussi pour cette période' using errcode = 'P0001';
  end if;
  if p_instance_ids is null or cardinality(p_instance_ids) = 0 or cardinality(p_instance_ids) > 30
     or (select count(distinct x) from unnest(p_instance_ids) x) <> cardinality(p_instance_ids) then
    raise exception 'Sélection invalide' using errcode = 'P0001';
  end if;

  -- Exemplaires du joueur, libres (ni en vente ni engagés)
  perform 1 from public.card_instances where id = any (p_instance_ids) order by id for update;
  if (select count(*) from public.card_instances
      where id = any (p_instance_ids) and owner_id = v_uid and not is_locked) <> cardinality(p_instance_ids) then
    raise exception 'Certaines cartes ne t''appartiennent pas ou sont en vente / dans un échange' using errcode = 'P0001';
  end if;
  -- Une carte engagée dans un échange en attente ne peut pas être sacrifiée
  if exists (select 1 from public.trade_items ti join public.trades t on t.id = ti.trade_id
             where t.status = 'pending' and ti.instance_id = any (p_instance_ids)) then
    raise exception 'Une carte est proposée dans un échange en attente' using errcode = 'P0001';
  end if;

  select array_agg(template_id order by id) into v_templates from public.card_instances where id = any (p_instance_ids);
  v_problem := public._sbc_check(c.requirements, v_templates);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;

  delete from public.card_instances where id = any (p_instance_ids);
  insert into public.sbc_completions (user_id, challenge_id, cards_used) values (v_uid, c.id, v_templates);
  perform public._grant_boosters(v_uid, c.reward_booster, c.reward_count, 'Défi réussi : ' || c.name);

  return jsonb_build_object('reward_booster', c.reward_booster, 'reward_count', c.reward_count);
end;
$$;

revoke execute on function public.sbc_list() from public, anon;
revoke execute on function public.submit_sbc(smallint, uuid[]) from public, anon;
grant execute on function public.sbc_list() to authenticated;
grant execute on function public.submit_sbc(smallint, uuid[]) to authenticated;
