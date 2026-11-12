-- =============================================================================
-- Phase 5 — Marché entre joueurs
-- Mise en vente (exemplaire verrouillé), annulation, achat atomique avec
-- commission, recherches journalisées, notifications et fil générés côté serveur.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

insert into public.app_settings (key, value, description) values
  ('market_min_price', '1', 'Prix minimum d''une annonce'),
  ('market_max_price', '1000000', 'Prix maximum d''une annonce'),
  ('market_max_active_listings', '50', 'Nombre maximum d''annonces actives par joueur')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- create_listing
-- -----------------------------------------------------------------------------
create function public.create_listing(p_instance_id uuid, p_price bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_min bigint := coalesce((public.get_setting('market_min_price'))::bigint, 1);
  v_max bigint := coalesce((public.get_setting('market_max_price'))::bigint, 1000000);
  v_max_active int := coalesce((public.get_setting('market_max_active_listings'))::int, 50);
  ci public.card_instances%rowtype;
  v_listing uuid;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour vendre' using errcode = 'P0001';
  end if;
  if p_price is null or p_price < v_min or p_price > v_max then
    raise exception 'Le prix doit être compris entre % et % pièces', v_min, v_max using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if (select count(*) from public.market_listings where seller_id = v_uid and status = 'active') >= v_max_active then
    raise exception 'Tu as déjà % annonces en cours', v_max_active using errcode = 'P0001';
  end if;

  select * into ci from public.card_instances where id = p_instance_id for update;
  if not found or ci.owner_id <> v_uid then
    raise exception 'Cet exemplaire ne t''appartient pas' using errcode = 'P0001';
  end if;
  if ci.is_locked then
    raise exception 'Cet exemplaire est déjà en vente ou dans un échange' using errcode = 'P0001';
  end if;

  update public.card_instances set is_locked = true where id = ci.id;
  delete from public.profile_showcase where instance_id = ci.id;

  insert into public.market_listings (seller_id, instance_id, template_id, price)
  values (v_uid, ci.id, ci.template_id, p_price)
  returning id into v_listing;
  return v_listing;
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_listing
-- -----------------------------------------------------------------------------
create function public.cancel_listing(p_listing_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  l public.market_listings%rowtype;
begin
  select * into l from public.market_listings where id = p_listing_id for update;
  if not found or l.seller_id is distinct from v_uid then
    raise exception 'Annonce introuvable' using errcode = 'P0001';
  end if;
  if l.status <> 'active' then
    raise exception 'Cette annonce n''est plus active (déjà vendue ou retirée)' using errcode = 'P0001';
  end if;

  update public.market_listings set status = 'cancelled', closed_at = now() where id = l.id;
  update public.card_instances set is_locked = false where id = l.instance_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- buy_listing : achat atomique.
-- 1. verrou de l'annonce (départage les acheteurs simultanés)
-- 2. verrou des deux profils dans un ordre fixe (évite les interblocages
--    quand deux joueurs s'achètent mutuellement une carte au même moment)
-- 3. débit acheteur, crédit vendeur moins la commission (détruite : puits de monnaie)
-- 4. transfert de l'exemplaire, historique, vente, notification, fil
-- -----------------------------------------------------------------------------
create function public.buy_listing(p_listing_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  l public.market_listings%rowtype;
  ci public.card_instances%rowtype;
  v_fee_pct numeric := coalesce((public.get_setting('market_fee_percent'))::numeric, 5);
  v_threshold bigint := coalesce((public.get_setting('big_sale_threshold'))::bigint, 2000);
  v_fee bigint;
  v_balance bigint;
  v_seller_hidden boolean;
  v_player text;
  v_buyer_name text;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour acheter' using errcode = 'P0001';
  end if;

  select * into l from public.market_listings where id = p_listing_id for update;
  if not found then
    raise exception 'Annonce introuvable' using errcode = 'P0001';
  end if;
  if l.status <> 'active' then
    raise exception 'Trop tard : cette carte vient d''être vendue ou retirée' using errcode = 'P0001';
  end if;
  if l.seller_id = v_uid then
    raise exception 'Tu ne peux pas acheter ta propre annonce' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id in (v_uid, l.seller_id) order by id for update;

  select * into ci from public.card_instances where id = l.instance_id for update;
  if not found or ci.owner_id <> l.seller_id or not ci.is_locked then
    raise exception 'Annonce invalide' using errcode = 'P0001';
  end if;

  v_fee := floor(l.price * v_fee_pct / 100);
  select display_name into v_player from public.players p join public.card_templates ct on ct.player_id = p.id where ct.id = l.template_id;
  select username into v_buyer_name from public.profiles where id = v_uid;

  v_balance := public._apply_coins(v_uid, -l.price, 'market_purchase', 'Achat : ' || v_player, 'listing', l.id::text);
  if l.price - v_fee > 0 then
    perform public._apply_coins(l.seller_id, l.price - v_fee, 'market_sale',
      'Vente : ' || v_player || ' (commission ' || v_fee || ')', 'listing', l.id::text);
  end if;

  update public.card_instances
  set owner_id = v_uid, is_locked = false, obtained_via = 'market', obtained_at = now()
  where id = ci.id;
  insert into public.card_instance_history (instance_id, event, from_user_id, to_user_id, price)
  values (ci.id, 'market_sale', l.seller_id, v_uid, l.price);

  update public.market_listings set status = 'sold', buyer_id = v_uid, closed_at = now() where id = l.id;
  insert into public.market_sales (listing_id, template_id, seller_id, buyer_id, price, fee)
  values (l.id, l.template_id, l.seller_id, v_uid, l.price, v_fee);

  insert into public.notifications (user_id, type, title, body, link)
  values (l.seller_id, 'market_sale', 'Carte vendue !',
          v_buyer_name || ' a acheté ' || v_player || ' pour ' || l.price || ' pièces (' || (l.price - v_fee) || ' encaissées).',
          '/marche?onglet=mes-annonces');

  select hide_activity into v_seller_hidden from public.profiles where id = l.seller_id;
  if l.price >= v_threshold and not v_seller_hidden then
    insert into public.activity_feed (user_id, type, template_id, payload)
    values (l.seller_id, 'big_sale', l.template_id,
            jsonb_build_object('price', l.price, 'buyer', v_buyer_name, 'listing_id', l.id));
  end if;

  return jsonb_build_object('instance_id', ci.id, 'price', l.price, 'fee', v_fee, 'balance', v_balance);
end;
$$;

-- -----------------------------------------------------------------------------
-- Recherches du marché (pour « cartes les plus recherchées »)
-- Une recherche textuelle est rattachée aux cartes correspondantes (20 max).
-- Une même recherche du même joueur n'est comptée qu'une fois par heure.
-- -----------------------------------------------------------------------------
create function public.record_market_search(p_query text default null, p_template_id int default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := nullif(btrim(left(coalesce(p_query, ''), 60)), '');
begin
  if v_uid is null then
    return;
  end if;

  if p_template_id is not null then
    if not exists (select 1 from public.market_searches
                   where user_id = v_uid and template_id = p_template_id and created_at > now() - interval '1 hour') then
      insert into public.market_searches (user_id, template_id) values (v_uid, p_template_id);
    end if;
    return;
  end if;

  if v_q is null or char_length(v_q) < 3 then
    return;
  end if;
  if exists (select 1 from public.market_searches
             where user_id = v_uid and lower(query) = lower(v_q) and created_at > now() - interval '1 hour') then
    return;
  end if;

  insert into public.market_searches (user_id, query, template_id)
  select v_uid, v_q, ct.id
  from public.card_templates ct
  join public.players p on p.id = ct.player_id
  where ct.is_active
    and extensions.unaccent('extensions.unaccent'::regdictionary, p.display_name)
        ilike '%' || extensions.unaccent('extensions.unaccent'::regdictionary, v_q) || '%'
  order by ct.rating desc
  limit 20;
end;
$$;


-- Cartes les plus recherchées : recherches des 30 derniers jours + listes de souhaits (poids 3)
create view public.most_wanted_cards
with (security_invoker = false)
as
select ct.id as template_id,
       coalesce(s.searches, 0)::int as searches,
       coalesce(w.wishes, 0)::int as wishes,
       (coalesce(s.searches, 0) + 3 * coalesce(w.wishes, 0))::int as score
from public.card_templates ct
left join (select template_id, count(*) as searches from public.market_searches
           where template_id is not null and created_at > now() - interval '30 days' group by template_id) s
  on s.template_id = ct.id
left join (select template_id, count(*) as wishes from public.wishlists group by template_id) w
  on w.template_id = ct.id
where coalesce(s.searches, 0) + coalesce(w.wishes, 0) > 0;

revoke all on public.most_wanted_cards from anon;
grant select on public.most_wanted_cards to authenticated;

-- Statistiques de prix par carte (historique complet)
create view public.market_price_stats
with (security_invoker = true)
as
select template_id,
       count(*)::int as sales,
       min(price)::bigint as min_price,
       max(price)::bigint as max_price,
       round(avg(price))::bigint as avg_price,
       (array_agg(price order by created_at desc))[1]::bigint as last_price
from public.market_sales
group by template_id;

grant select on public.market_price_stats to authenticated;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public.create_listing(uuid, bigint) from public, anon;
revoke execute on function public.cancel_listing(uuid) from public, anon;
revoke execute on function public.buy_listing(uuid) from public, anon;
revoke execute on function public.record_market_search(text, int) from public, anon;
grant execute on function public.create_listing(uuid, bigint) to authenticated;
grant execute on function public.cancel_listing(uuid) to authenticated;
grant execute on function public.buy_listing(uuid) to authenticated;
grant execute on function public.record_market_search(text, int) to authenticated;
