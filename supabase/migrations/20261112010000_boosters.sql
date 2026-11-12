-- =============================================================================
-- Phase 2 — Boosters : ouverture atomique, revente des doublons au système
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tirage d'une rareté selon les probabilités du booster.
-- p_min_rank > 1 restreint le tirage aux raretés >= ce rang (garanties),
-- en renormalisant les probabilités concernées.
-- -----------------------------------------------------------------------------
create function public._roll_rarity(p_booster int, p_min_rank int default 1)
returns public.rarity
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_total numeric;
  v_roll numeric;
  v_acc numeric := 0;
  r record;
begin
  select coalesce(sum(probability), 0) into v_total
  from public.booster_odds
  where booster_id = p_booster and public.rarity_rank(rarity) >= p_min_rank;

  if v_total <= 0 then
    -- Aucune probabilité définie au-dessus du seuil : on prend la rareté du seuil
    return (array['commune','rare','epique','legendaire','iconique','speciale']::public.rarity[])[p_min_rank];
  end if;

  v_roll := random() * v_total;
  for r in
    select rarity, probability from public.booster_odds
    where booster_id = p_booster and public.rarity_rank(rarity) >= p_min_rank and probability > 0
    order by public.rarity_rank(rarity)
  loop
    v_acc := v_acc + r.probability;
    if v_roll < v_acc then
      return r.rarity;
    end if;
  end loop;
  return r.rarity; -- arrondi : dernière rareté parcourue
end;
$$;

-- -----------------------------------------------------------------------------
-- Choix d'un modèle de carte de la rareté demandée, dans le pool du booster,
-- parmi ceux dont le tirage n'est pas épuisé. Si aucun n'est disponible,
-- on descend d'une rareté (jamais sous p_floor_rank).
-- -----------------------------------------------------------------------------
create function public._pick_template(p_booster int, p_rarity public.rarity, p_floor_rank int default 1)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_has_pool boolean;
  v_rank int := public.rarity_rank(p_rarity);
  v_tpl int;
begin
  select exists (select 1 from public.booster_cards where booster_id = p_booster) into v_has_pool;

  while v_rank >= p_floor_rank loop
    select ct.id into v_tpl
    from public.card_templates ct
    where ct.is_active
      and public.rarity_rank(ct.rarity) = v_rank
      and (ct.max_supply is null or ct.minted_count < ct.max_supply)
      and (not v_has_pool or exists (
        select 1 from public.booster_cards bc where bc.booster_id = p_booster and bc.template_id = ct.id))
    order by random()
    limit 1;
    if v_tpl is not null then
      return v_tpl;
    end if;
    v_rank := v_rank - 1;
  end loop;
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Disponibilité d'un booster pour le joueur connecté (affichage).
-- -----------------------------------------------------------------------------
create function public.booster_availability(p_booster int)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b public.boosters%rowtype;
  v_uid uuid := auth.uid();
  v_last timestamptz;
  v_next timestamptz;
  v_hours numeric := coalesce((public.get_setting('free_booster_hours'))::numeric, 8);
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
    select last_free_booster_at into v_last from public.profiles where id = v_uid;
    v_next := v_last + make_interval(secs => v_hours * 3600);
    if v_last is not null and now() < v_next then
      return jsonb_build_object('available', false, 'reason', 'cooldown', 'next_at', v_next);
    end if;
  end if;
  return jsonb_build_object('available', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- open_booster : RPC atomique.
-- Vérifie disponibilité / délai / stock / dates / solde, débite, tire les cartes
-- côté serveur, crée les exemplaires, journalise, publie les hautes raretés.
-- -----------------------------------------------------------------------------
create function public.open_booster(p_booster_id int)
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
  v_hours numeric := coalesce((public.get_setting('free_booster_hours'))::numeric, 8);
  v_guarantee_rank int;
  v_met int := 0;
  v_rarity public.rarity;
  v_floor int;
  v_tpl int;
  v_tpl_rarity public.rarity;
  v_instance uuid;
  v_serial int;
  v_is_new boolean;
  v_seen int[] := '{}';
  v_instances uuid[] := '{}';
  v_cards jsonb := '[]';
  v_opening uuid;
  v_balance bigint;
  i int;
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
    if p.last_free_booster_at is not null
       and now() < p.last_free_booster_at + make_interval(secs => v_hours * 3600) then
      raise exception 'Ton booster gratuit n''est pas encore prêt' using errcode = 'P0001';
    end if;
    update public.profiles set last_free_booster_at = now() where id = v_uid;
  end if;

  -- Stock limité : décrément atomique (le verrou de ligne départage les acheteurs simultanés)
  if b.kind = 'limited' then
    update public.boosters set stock_remaining = stock_remaining - 1
    where id = b.id and stock_remaining > 0;
    if not found then
      raise exception 'Rupture de stock : ce booster est épuisé' using errcode = 'P0001';
    end if;
  end if;

  -- Paiement
  if b.price > 0 then
    v_balance := public._apply_coins(v_uid, -b.price, 'booster_purchase', 'Booster ' || b.name, 'booster', b.id::text);
  else
    v_balance := p.coins;
  end if;

  -- Tirage
  v_guarantee_rank := case when b.guarantee_rarity is null then 1 else public.rarity_rank(b.guarantee_rarity) end;

  for i in 1..b.cards_count loop
    v_floor := 1;
    if b.guarantee_count > v_met and (b.guarantee_count - v_met) >= (b.cards_count - i + 1) then
      v_floor := v_guarantee_rank; -- il ne reste que les places garanties
    end if;

    v_rarity := public._roll_rarity(b.id, v_floor);
    v_tpl := public._pick_template(b.id, v_rarity, v_floor);
    if v_tpl is null then
      raise exception 'Booster momentanément indisponible (cartes épuisées)' using errcode = 'P0001';
    end if;

    select rarity into v_tpl_rarity from public.card_templates where id = v_tpl;
    if public.rarity_rank(v_tpl_rarity) >= v_guarantee_rank then
      v_met := v_met + 1;
    end if;

    v_is_new := not (v_tpl = any (v_seen))
      and not exists (select 1 from public.card_instances where owner_id = v_uid and template_id = v_tpl);
    v_seen := v_seen || v_tpl;

    v_instance := public._mint_card(v_tpl, v_uid, 'booster');
    select serial_number into v_serial from public.card_instances where id = v_instance;
    v_instances := v_instances || v_instance;
    v_cards := v_cards || jsonb_build_object(
      'instance_id', v_instance, 'template_id', v_tpl, 'serial_number', v_serial,
      'rarity', v_tpl_rarity, 'is_new', v_is_new);

    if public.rarity_rank(v_tpl_rarity) >= 4 and not p.hide_activity then
      insert into public.activity_feed (user_id, type, template_id, payload)
      values (v_uid, 'rare_pull', v_tpl,
              jsonb_build_object('instance_id', v_instance, 'serial_number', v_serial, 'rarity', v_tpl_rarity, 'booster', b.name));
    end if;
  end loop;

  insert into public.booster_openings (user_id, booster_id, price_paid, instance_ids)
  values (v_uid, b.id, b.price, v_instances)
  returning id into v_opening;

  return jsonb_build_object('opening_id', v_opening, 'balance', v_balance, 'cards', v_cards);
end;
$$;

-- -----------------------------------------------------------------------------
-- sell_duplicates : revente au système d'exemplaires en double.
-- Chaque exemplaire doit appartenir au joueur, ne pas être verrouillé
-- (vente / échange), et le joueur doit conserver au moins un exemplaire de la carte.
-- -----------------------------------------------------------------------------
create function public.sell_duplicates(p_instance_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_prices jsonb := public.get_setting('duplicate_sell_prices');
  v_total bigint := 0;
  v_count int := 0;
  v_balance bigint;
  r record;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour revendre' using errcode = 'P0001';
  end if;
  if p_instance_ids is null or cardinality(p_instance_ids) = 0 then
    raise exception 'Aucun exemplaire sélectionné' using errcode = 'P0001';
  end if;
  if cardinality(p_instance_ids) > 200 then
    raise exception 'Trop d''exemplaires à la fois (200 max)' using errcode = 'P0001';
  end if;

  -- Verrou du joueur puis de tous ses exemplaires des cartes concernées (ordre stable)
  perform 1 from public.profiles where id = v_uid for update;
  perform 1 from public.card_instances
  where owner_id = v_uid
    and template_id in (select template_id from public.card_instances where id = any (p_instance_ids))
  order by id
  for update;

  for r in
    select ci.id, ci.owner_id, ci.is_locked, ci.template_id, ct.rarity
    from public.card_instances ci
    join public.card_templates ct on ct.id = ci.template_id
    where ci.id = any (p_instance_ids)
    order by ci.id
  loop
    if r.owner_id <> v_uid then
      raise exception 'Cet exemplaire ne t''appartient pas' using errcode = 'P0001';
    end if;
    if r.is_locked then
      raise exception 'Un exemplaire est en vente ou dans un échange' using errcode = 'P0001';
    end if;
    if (select count(*) from public.card_instances where owner_id = v_uid and template_id = r.template_id) <= 1 then
      raise exception 'Tu dois garder au moins un exemplaire de chaque carte' using errcode = 'P0001';
    end if;

    v_total := v_total + coalesce((v_prices ->> r.rarity::text)::bigint, 0);
    v_count := v_count + 1;
    delete from public.card_instances where id = r.id;
  end loop;

  if v_count <> cardinality(p_instance_ids) then
    raise exception 'Exemplaire introuvable' using errcode = 'P0001';
  end if;

  v_balance := public._apply_coins(
    v_uid, v_total, 'duplicate_sale',
    case when v_count = 1 then 'Revente d''un doublon' else 'Revente de ' || v_count || ' doublons' end,
    'duplicates', v_count::text);

  return jsonb_build_object('sold', v_count, 'coins', v_total, 'balance', v_balance);
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public._roll_rarity(int, int) from public, anon, authenticated;
revoke execute on function public._pick_template(int, public.rarity, int) from public, anon, authenticated;
revoke execute on function public.open_booster(int) from public, anon;
revoke execute on function public.sell_duplicates(uuid[]) from public, anon;
revoke execute on function public.booster_availability(int) from public, anon;
grant execute on function public.open_booster(int) to authenticated;
grant execute on function public.sell_duplicates(uuid[]) to authenticated;
grant execute on function public.booster_availability(int) to authenticated;
