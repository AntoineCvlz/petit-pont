-- =============================================================================
-- Boosters Bronze / Argent / Or et booster gratuit cumulable (décision du porteur du projet, nov. 2026)
--   - Bronze : cartes notées 64 et moins ; Argent : 65 à 74 ; Or : 75 et plus.
--     Les slugs « standard » (Argent) et « premium » (Or) sont conservés : récompenses de défis, saison,
--     missions et clans y font référence.
--   - Booster gratuit : 8 cartes (2 Bronze, 2 Argent, 4 Or), via une composition par emplacements (slots).
--     Un booster gratuit se débloque toutes les 10 minutes, jusqu'à 10 en réserve.
--   - Anciens boosters classiques retirés de la vente (Nuit des Étoiles, Coupe des Étoiles).
-- =============================================================================

alter table public.boosters add column slots jsonb;
comment on column public.boosters.slots is
  'Composition par emplacements : [{"booster": "<slug>", "count": n}, …]. Chaque carte est tirée avec les cotes et '
  'la réserve du booster cité. Si renseigné, cards_count = somme des count.';

insert into public.app_settings (key, value, description) values
  ('free_booster_cap', '10', 'Nombre maximal de boosters gratuits en réserve')
on conflict (key) do nothing;

alter table public.boosters drop constraint boosters_category_check;
alter table public.boosters add constraint boosters_category_check
  check (category in ('classique', 'europe', 'championnat', 'nation', 'style'));

-- Règle de réserve : ajout de rating_max (paliers Bronze / Argent / Or)
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

-- Tirage : chaque emplacement peut puiser dans un autre booster (cotes + réserve)
create or replace function public._draw_booster(p_uid uuid, p_booster_id int, p_price int, p_grant_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b public.boosters%rowtype;
  v_hide boolean;
  v_guarantee_rank int;
  v_met int := 0;
  v_rarity public.rarity;
  v_floor int;
  v_src int;
  v_sources int[];
  v_count int;
  v_tpl int;
  v_tpl_rarity public.rarity;
  v_instance uuid;
  v_serial int;
  v_is_new boolean;
  v_seen int[] := '{}';
  v_instances uuid[] := '{}';
  v_cards jsonb := '[]';
  v_opening uuid;
  i int;
begin
  select * into b from public.boosters where id = p_booster_id;
  select hide_activity into v_hide from public.profiles where id = p_uid;
  v_guarantee_rank := case when b.guarantee_rarity is null then 1 else public.rarity_rank(b.guarantee_rarity) end;

  if b.slots is not null then
    select array_agg(sb.id order by s.ord, g) into v_sources
    from jsonb_array_elements(b.slots) with ordinality s(v, ord)
    join public.boosters sb on sb.slug = s.v ->> 'booster'
    cross join generate_series(1, (s.v ->> 'count')::int) g;
  end if;
  v_count := coalesce(array_length(v_sources, 1), b.cards_count);

  for i in 1..v_count loop
    v_src := coalesce(v_sources[i], b.id);
    v_floor := 1;
    if b.guarantee_count > v_met and (b.guarantee_count - v_met) >= (v_count - i + 1) then
      v_floor := v_guarantee_rank; -- il ne reste que les places garanties
    end if;

    v_rarity := public._roll_rarity(v_src, v_floor);
    v_tpl := public._pick_template(v_src, v_rarity, v_floor);
    if v_tpl is null then
      raise exception 'Booster momentanément indisponible (cartes épuisées)' using errcode = 'P0001';
    end if;

    select rarity into v_tpl_rarity from public.card_templates where id = v_tpl;
    if public.rarity_rank(v_tpl_rarity) >= v_guarantee_rank then
      v_met := v_met + 1;
    end if;

    v_is_new := not (v_tpl = any (v_seen))
      and not exists (select 1 from public.card_instances where owner_id = p_uid and template_id = v_tpl);
    v_seen := v_seen || v_tpl;

    v_instance := public._mint_card(v_tpl, p_uid, 'booster');
    select serial_number into v_serial from public.card_instances where id = v_instance;
    v_instances := v_instances || v_instance;
    v_cards := v_cards || jsonb_build_object(
      'instance_id', v_instance, 'template_id', v_tpl, 'serial_number', v_serial,
      'rarity', v_tpl_rarity, 'is_new', v_is_new);

    if public.rarity_rank(v_tpl_rarity) >= 4 and not coalesce(v_hide, false) then
      insert into public.activity_feed (user_id, type, template_id, payload)
      values (p_uid, 'rare_pull', v_tpl,
              jsonb_build_object('instance_id', v_instance, 'serial_number', v_serial, 'rarity', v_tpl_rarity, 'booster', b.name));
    end if;
  end loop;

  insert into public.booster_openings (user_id, booster_id, price_paid, instance_ids, template_ids, grant_id)
  values (p_uid, b.id, p_price, v_instances, v_seen, p_grant_id)
  returning id into v_opening;

  return jsonb_build_object('opening_id', v_opening, 'cards', v_cards);
end;
$$;
revoke execute on function public._draw_booster(uuid, int, int, uuid) from public, anon, authenticated;

-- Réserve de boosters gratuits. profiles.last_free_booster_at sert d'ancre : la réserve vaut
-- min(plafond, temps écoulé depuis l'ancre / délai) ; null = réserve pleine.
create function public._free_booster_stock(p_anchor timestamptz)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  -- Même pas que open_booster (intervalle arrondi à la microseconde) pour une division exacte
  select case
    when p_anchor is null then coalesce((public.get_setting('free_booster_cap'))::int, 10)
    else least(
      coalesce((public.get_setting('free_booster_cap'))::int, 10),
      floor(extract(epoch from (now() - p_anchor)) / extract(epoch from make_interval(
        secs => coalesce((public.get_setting('free_booster_hours'))::numeric, 8) * 3600)))::int)
  end;
$$;
revoke execute on function public._free_booster_stock(timestamptz) from public, anon, authenticated;

create or replace function public.open_booster(p_booster_id int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  b public.boosters%rowtype;
  p public.profiles%rowtype;
  v_step interval := make_interval(secs => coalesce((public.get_setting('free_booster_hours'))::numeric, 8) * 3600);
  v_cap int := coalesce((public.get_setting('free_booster_cap'))::int, 10);
  v_stock int;
  v_balance bigint;
  v_draw jsonb;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour ouvrir un booster' using errcode = 'P0001';
  end if;

  select * into b from public.boosters where id = p_booster_id;
  if not found or not b.is_active then
    raise exception 'Ce booster n''est pas disponible' using errcode = 'P0001';
  end if;
  if (b.starts_at is not null and now() < b.starts_at) or (b.ends_at is not null and now() >= b.ends_at) then
    raise exception 'Ce booster n''est pas disponible en ce moment' using errcode = 'P0001';
  end if;

  -- Verrou du joueur : sérialise ses ouvertures (double clic, onglets multiples)
  select * into p from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Profil introuvable' using errcode = 'P0001';
  end if;

  if b.kind = 'free' then
    v_stock := public._free_booster_stock(p.last_free_booster_at);
    if v_stock < 1 then
      raise exception 'Ton booster gratuit n''est pas encore prêt' using errcode = 'P0001';
    end if;
    -- Réserve pleine : le décompte du suivant démarre maintenant ; sinon on garde l'avance déjà acquise
    update public.profiles
    set last_free_booster_at = case when v_stock >= v_cap then now() - (v_cap - 1) * v_step
                                    else last_free_booster_at + v_step end
    where id = v_uid;
  end if;

  -- Stock limité : décrément atomique (le verrou de ligne départage les acheteurs simultanés)
  if b.kind = 'limited' then
    update public.boosters set stock_remaining = stock_remaining - 1
    where id = b.id and stock_remaining > 0;
    if not found then
      raise exception 'Rupture de stock : ce booster est épuisé' using errcode = 'P0001';
    end if;
  end if;

  if b.price > 0 then
    v_balance := public._apply_coins(v_uid, -b.price, 'booster_purchase', 'Booster ' || b.name, 'booster', b.id::text);
  else
    v_balance := p.coins;
  end if;

  v_draw := public._draw_booster(v_uid, b.id, b.price);
  return v_draw || jsonb_build_object('balance', v_balance);
end;
$$;

create or replace function public.booster_availability(p_booster int)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b public.boosters%rowtype;
  v_uid uuid := auth.uid();
  v_anchor timestamptz;
  v_stock int;
  v_cap int := coalesce((public.get_setting('free_booster_cap'))::int, 10);
  v_step interval := make_interval(secs => coalesce((public.get_setting('free_booster_hours'))::numeric, 8) * 3600);
  v_next timestamptz;
begin
  select * into b from public.boosters where id = p_booster;
  if not found or not b.is_active then
    return jsonb_build_object('available', false, 'reason', 'inactive');
  end if;
  if b.starts_at is not null and now() < b.starts_at then
    return jsonb_build_object('available', false, 'reason', 'not_started', 'starts_at', b.starts_at);
  end if;
  if b.ends_at is not null and now() >= b.ends_at then
    return jsonb_build_object('available', false, 'reason', 'ended');
  end if;
  if b.kind = 'limited' and b.stock_remaining <= 0 then
    return jsonb_build_object('available', false, 'reason', 'sold_out');
  end if;
  if b.kind = 'free' then
    select last_free_booster_at into v_anchor from public.profiles where id = v_uid;
    v_stock := public._free_booster_stock(v_anchor);
    if v_stock < v_cap then
      v_next := v_anchor + (v_stock + 1) * v_step;
    end if;
    if v_stock < 1 then
      return jsonb_build_object('available', false, 'reason', 'cooldown', 'next_at', v_next, 'stock', 0, 'cap', v_cap);
    end if;
    return jsonb_build_object('available', true, 'stock', v_stock, 'cap', v_cap, 'next_at', v_next);
  end if;
  return jsonb_build_object('available', true);
end;
$$;

-- --- Les boosters ------------------------------------------------------------
-- Anciens classiques retirés de la vente (exemplaires et historique conservés), y compris ceux créés depuis
-- l'administration : seuls restent les boosters à thème et les quatre ci-dessous.
update public.boosters set is_active = false
where category = 'classique' and slug not in ('gratuit', 'bronze', 'standard', 'premium');

insert into public.boosters (slug, name, description, kind, price, cards_count, guarantee_rarity, guarantee_count,
                             sort_order, category, pool_rule, slots)
values
  ('gratuit', 'Booster du vestiaire',
   '2 Bronze, 2 Argent et 4 Or. Un nouveau toutes les 10 minutes, jusqu''à 10 en réserve.',
   'free', 0, 8, null, 0, 1, 'classique', null,
   '[{"booster": "bronze", "count": 2}, {"booster": "standard", "count": 2}, {"booster": "premium", "count": 4}]'),
  ('bronze', 'Booster Bronze', 'Cinq cartes Bronze (joueurs notés 64 et moins).',
   'standard', 100, 5, null, 0, 2, 'classique', '{"rating_max": 64}', null),
  ('standard', 'Booster Argent', 'Cinq cartes Argent (joueurs notés de 65 à 74).',
   'standard', 250, 5, null, 0, 3, 'classique', '{"rating_min": 65, "rating_max": 74}', null),
  ('premium', 'Booster Or', 'Cinq cartes Or (joueurs notés 75 et plus).',
   'premium', 600, 5, null, 0, 4, 'classique', '{"rating_min": 75}', null)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, kind = excluded.kind, price = excluded.price,
  cards_count = excluded.cards_count, guarantee_rarity = excluded.guarantee_rarity,
  guarantee_count = excluded.guarantee_count, sort_order = excluded.sort_order, category = excluded.category,
  pool_rule = excluded.pool_rule, slots = excluded.slots, is_active = true, image_url = null;

-- Cotes (le total à 100 % est vérifié en fin de transaction). Celles du gratuit ne servent pas au tirage
-- (emplacements) : moyenne indicative des 8 cartes.
delete from public.booster_odds
where booster_id in (select id from public.boosters where slug in ('gratuit', 'bronze', 'standard', 'premium'));
insert into public.booster_odds (booster_id, rarity, probability)
select b.id, o.rarity::public.rarity, o.p
from (values
  ('bronze', 'commune', 100.00),
  ('standard', 'commune', 70.00), ('standard', 'rare', 30.00),
  ('premium', 'rare', 55.00), ('premium', 'epique', 33.00), ('premium', 'legendaire', 9.00),
  ('premium', 'iconique', 2.50), ('premium', 'speciale', 0.50),
  ('gratuit', 'commune', 42.50), ('gratuit', 'rare', 35.00), ('gratuit', 'epique', 16.50),
  ('gratuit', 'legendaire', 4.50), ('gratuit', 'iconique', 1.25), ('gratuit', 'speciale', 0.25)
) as o(slug, rarity, p)
join public.boosters b on b.slug = o.slug;

-- Packs offerts non ouverts d'un booster retiré : convertis en Booster Or (ils restent ouvrables)
update public.booster_grants g set booster_id = (select id from public.boosters where slug = 'premium')
from public.boosters b
where b.id = g.booster_id and g.opened_at is null and not b.is_active;

select public.refresh_booster_pools();
