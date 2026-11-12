-- =============================================================================
-- Administration des comptes joueurs
--   - packs offerts (inventaire, ouverts par le joueur avec l'animation habituelle)
--   - cartes offertes, pièces ajoutées / retirées
--   - retrait de cartes, réinitialisation d'un compte, bannissement
--   - lecture admin : ouvertures de boosters, échanges, journaux de pièces
--   - journal des actions d'administration
-- Toutes les écritures passent par des RPC SECURITY DEFINER qui revérifient le rôle admin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schéma
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column banned_at timestamptz,
  add column ban_reason text check (ban_reason is null or char_length(ban_reason) <= 300);

-- Cartes tirées par ouverture (les exemplaires peuvent ensuite changer de main ou disparaître)
alter table public.booster_openings
  add column template_ids int[] not null default '{}',
  add column grant_id uuid;
update public.booster_openings o
set template_ids = coalesce((
  select array_agg(ci.template_id order by u.ord)
  from unnest(o.instance_ids) with ordinality as u(id, ord)
  join public.card_instances ci on ci.id = u.id
), '{}');
create index booster_openings_created_idx on public.booster_openings (created_at desc);

-- Packs offerts par un admin, en attente d'ouverture
create table public.booster_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  booster_id int not null references public.boosters (id),
  granted_by uuid references public.profiles (id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  opening_id uuid references public.booster_openings (id) on delete set null
);
create index booster_grants_user_idx on public.booster_grants (user_id) where opened_at is null;
alter table public.booster_openings
  add constraint booster_openings_grant_fk foreign key (grant_id) references public.booster_grants (id) on delete set null;

-- Journal des actions d'administration
create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  target_id uuid references public.profiles (id) on delete set null,
  target_username text,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_actions_created_idx on public.admin_actions (created_at desc);
create index admin_actions_target_idx on public.admin_actions (target_id, created_at desc);

-- Une carte supprimée ne doit pas effacer l'historique des ventes du marché (prix moyens)
alter table public.market_listings alter column instance_id drop not null;
alter table public.market_listings drop constraint market_listings_instance_id_fkey;
alter table public.market_listings
  add constraint market_listings_instance_id_fkey foreign key (instance_id)
  references public.card_instances (id) on delete set null;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.booster_grants enable row level security;
alter table public.admin_actions enable row level security;
grant select on public.booster_grants, public.admin_actions to authenticated;

create policy "Mes packs offerts" on public.booster_grants for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admin : journal" on public.admin_actions for select to authenticated
  using ((select public.is_admin()));
create policy "Admin : ouvertures" on public.booster_openings for select to authenticated
  using ((select public.is_admin()));
create policy "Admin : échanges" on public.trades for select to authenticated
  using ((select public.is_admin()));
create policy "Admin : contenu des échanges" on public.trade_items for select to authenticated
  using ((select public.is_admin()));
create policy "Admin : journaux de pièces" on public.coin_transactions for select to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Bannissement : toute écriture de jeu d'un compte suspendu est refusée
-- (filet de sécurité pour un jeton encore valide après le bannissement)
-- -----------------------------------------------------------------------------
create function public._reject_banned_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and exists (select 1 from public.profiles where id = auth.uid() and banned_at is not null) then
    raise exception 'Ton compte est suspendu' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public._reject_banned_actor() from public, anon, authenticated;

create trigger reject_banned_actor before insert on public.coin_transactions
  for each row execute function public._reject_banned_actor();
create trigger reject_banned_actor before insert on public.card_instances
  for each row execute function public._reject_banned_actor();
create trigger reject_banned_actor before insert on public.market_listings
  for each row execute function public._reject_banned_actor();
create trigger reject_banned_actor before insert or update on public.trades
  for each row execute function public._reject_banned_actor();

-- -----------------------------------------------------------------------------
-- Tirage commun (booster acheté, gratuit ou offert)
-- -----------------------------------------------------------------------------
create function public._draw_booster(p_uid uuid, p_booster_id int, p_price int, p_grant_id uuid default null)
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

-- Ouverture d'un booster acheté ou gratuit (validation et paiement inchangés, tirage mutualisé)
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
  v_hours numeric := coalesce((public.get_setting('free_booster_hours'))::numeric, 8);
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

  if b.price > 0 then
    v_balance := public._apply_coins(v_uid, -b.price, 'booster_purchase', 'Booster ' || b.name, 'booster', b.id::text);
  else
    v_balance := p.coins;
  end if;

  v_draw := public._draw_booster(v_uid, b.id, b.price);
  return v_draw || jsonb_build_object('balance', v_balance);
end;
$$;

-- Ouverture d'un pack offert par un admin
create function public.open_granted_booster(p_grant_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  g public.booster_grants%rowtype;
  v_balance bigint;
  v_draw jsonb;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour ouvrir un booster' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where id = v_uid for update;

  select * into g from public.booster_grants where id = p_grant_id for update;
  if not found or g.user_id <> v_uid then
    raise exception 'Pack introuvable' using errcode = 'P0001';
  end if;
  if g.opened_at is not null then
    raise exception 'Ce pack a déjà été ouvert' using errcode = 'P0001';
  end if;

  v_draw := public._draw_booster(v_uid, g.booster_id, 0, g.id);
  update public.booster_grants set opened_at = now(), opening_id = (v_draw ->> 'opening_id')::uuid where id = g.id;
  select coins into v_balance from public.profiles where id = v_uid;
  return v_draw || jsonb_build_object('balance', v_balance);
end;
$$;
revoke execute on function public.open_granted_booster(uuid) from public, anon;
grant execute on function public.open_granted_booster(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Outils internes
-- -----------------------------------------------------------------------------
-- Vérifie le rôle admin et verrouille le compte visé ; renvoie son pseudo
create function public._admin_target(p_user uuid, p_allow_admin_target boolean default true)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  select * into t from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Compte introuvable' using errcode = 'P0001';
  end if;
  if not p_allow_admin_target and (t.is_admin or t.id = auth.uid()) then
    raise exception 'Action impossible sur un administrateur' using errcode = 'P0001';
  end if;
  return t.username;
end;
$$;

create function public._admin_log(p_target uuid, p_username text, p_action text, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_actions (admin_id, target_id, target_username, action, details)
  values (auth.uid(), p_target, p_username, p_action, coalesce(p_details, '{}'));
$$;

create function public._clean_reason(p_reason text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(btrim(coalesce(p_reason, '')), 300), '');
$$;

-- Annule ce qui engage des exemplaires : annonces actives et échanges en attente qui les contiennent
create function public._release_instances(p_instance_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  update public.market_listings set status = 'cancelled', closed_at = now()
  where status = 'active' and instance_id = any (p_instance_ids);
  update public.card_instances set is_locked = false where id = any (p_instance_ids);

  for t in
    select tr.id, tr.proposer_id, tr.recipient_id
    from public.trades tr
    where tr.status = 'pending'
      and exists (select 1 from public.trade_items ti where ti.trade_id = tr.id and ti.instance_id = any (p_instance_ids))
    order by tr.id
    for update
  loop
    update public.trades set status = 'cancelled', resolved_at = now() where id = t.id;
    insert into public.notifications (user_id, type, title, body, link)
    select u, 'trade_cancelled', 'Échange annulé',
           'Une carte de cet échange a été retirée par un administrateur.', '/echanges?onglet=termines'
    from unnest(array[t.proposer_id, t.recipient_id]) as u;
  end loop;
end;
$$;

revoke execute on function public._admin_target(uuid, boolean) from public, anon, authenticated;
revoke execute on function public._admin_log(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public._release_instances(uuid[]) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Actions d'administration
-- -----------------------------------------------------------------------------
create function public.admin_give_boosters(p_user uuid, p_booster_id int, p_count int, p_reason text default null)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_booster text;
  v_reason text := public._clean_reason(p_reason);
begin
  v_name := public._admin_target(p_user);
  if p_count is null or p_count < 1 or p_count > 50 then
    raise exception 'Entre 1 et 50 packs à la fois' using errcode = 'P0001';
  end if;
  select name into v_booster from public.boosters where id = p_booster_id and is_active;
  if not found then
    raise exception 'Booster introuvable ou désactivé' using errcode = 'P0001';
  end if;

  insert into public.booster_grants (user_id, booster_id, granted_by, reason)
  select p_user, p_booster_id, auth.uid(), v_reason from generate_series(1, p_count);

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, 'gift', case when p_count = 1 then 'Un pack t''a été offert !' else p_count || ' packs t''ont été offerts !' end,
          v_booster || coalesce(' · ' || v_reason, ''), '/boosters');

  perform public._admin_log(p_user, v_name, 'give_boosters',
    jsonb_build_object('booster', v_booster, 'count', p_count, 'reason', v_reason));
  return p_count;
end;
$$;

create function public.admin_give_cards(p_user uuid, p_template_id int, p_count int, p_reason text default null)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_card text;
  v_reason text := public._clean_reason(p_reason);
  i int;
begin
  v_name := public._admin_target(p_user);
  if p_count is null or p_count < 1 or p_count > 20 then
    raise exception 'Entre 1 et 20 exemplaires à la fois' using errcode = 'P0001';
  end if;
  select pl.display_name || ' (' || ct.edition || ', ' || ct.rarity || ')' into v_card
  from public.card_templates ct join public.players pl on pl.id = ct.player_id
  where ct.id = p_template_id;
  if not found then
    raise exception 'Carte introuvable' using errcode = 'P0001';
  end if;

  for i in 1..p_count loop
    perform public._mint_card(p_template_id, p_user, 'admin');
  end loop;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, 'gift', case when p_count = 1 then 'Une carte t''a été offerte !' else p_count || ' cartes t''ont été offertes !' end,
          v_card || coalesce(' · ' || v_reason, ''), '/collection/' || p_template_id);

  perform public._admin_log(p_user, v_name, 'give_cards',
    jsonb_build_object('template_id', p_template_id, 'card', v_card, 'count', p_count, 'reason', v_reason));
  return p_count;
end;
$$;

create function public.admin_adjust_coins(p_user uuid, p_amount bigint, p_reason text default null)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_reason text := public._clean_reason(p_reason);
  v_balance bigint;
begin
  v_name := public._admin_target(p_user);
  if p_amount is null or p_amount = 0 or abs(p_amount) > 1000000 then
    raise exception 'Montant invalide (non nul, 1 000 000 maximum)' using errcode = 'P0001';
  end if;
  if p_amount < 0 and (select coins from public.profiles where id = p_user) < -p_amount then
    raise exception 'Le joueur n''a pas assez de pièces' using errcode = 'P0001';
  end if;

  v_balance := public._apply_coins(p_user, p_amount, 'admin_adjustment',
    coalesce(v_reason, case when p_amount > 0 then 'Cadeau de l''équipe' else 'Correction par l''équipe' end));

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, case when p_amount > 0 then 'gift' else 'admin' end,
          case when p_amount > 0 then p_amount || ' pièces t''ont été offertes !' else (-p_amount) || ' pièces ont été retirées de ton solde' end,
          v_reason, '/profil');

  perform public._admin_log(p_user, v_name, 'adjust_coins', jsonb_build_object('amount', p_amount, 'reason', v_reason));
  return v_balance;
end;
$$;

create function public.admin_remove_cards(p_instance_ids uuid[], p_reason text default null)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text := public._clean_reason(p_reason);
  r record;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if p_instance_ids is null or cardinality(p_instance_ids) = 0 or cardinality(p_instance_ids) > 200 then
    raise exception 'Sélectionne entre 1 et 200 exemplaires' using errcode = 'P0001';
  end if;

  perform 1 from public.card_instances where id = any (p_instance_ids) order by id for update;
  perform public._release_instances(p_instance_ids);

  for r in
    select ci.owner_id, p.username, count(*) as n,
           jsonb_agg(jsonb_build_object('card', pl.display_name || ' (' || ct.edition || ')', 'serial', ci.serial_number)) as cards
    from public.card_instances ci
    join public.profiles p on p.id = ci.owner_id
    join public.card_templates ct on ct.id = ci.template_id
    join public.players pl on pl.id = ct.player_id
    where ci.id = any (p_instance_ids)
    group by ci.owner_id, p.username
  loop
    insert into public.notifications (user_id, type, title, body, link)
    values (r.owner_id, 'admin',
            case when r.n = 1 then 'Une carte a été retirée de ta collection' else r.n || ' cartes ont été retirées de ta collection' end,
            v_reason, '/collection');
    perform public._admin_log(r.owner_id, r.username, 'remove_cards', jsonb_build_object('cards', r.cards, 'reason', v_reason));
    v_count := v_count + r.n;
  end loop;

  delete from public.card_instances where id = any (p_instance_ids);
  return v_count;
end;
$$;

create function public.admin_reset_account(p_user uuid, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_reason text := public._clean_reason(p_reason);
  v_ids uuid[];
  v_start bigint := coalesce((public.get_setting('starting_balance'))::bigint, 0);
  v_coins bigint;
  v_cards int;
begin
  v_name := public._admin_target(p_user, false);

  select coalesce(array_agg(id order by id), '{}') into v_ids from public.card_instances where owner_id = p_user;
  v_cards := cardinality(v_ids);
  perform 1 from public.card_instances where id = any (v_ids) order by id for update;
  perform public._release_instances(v_ids);

  -- Ses propres échanges en attente (même sans carte engagée)
  update public.trades set status = 'cancelled', resolved_at = now()
  where status = 'pending' and (proposer_id = p_user or recipient_id = p_user);

  delete from public.card_instances where owner_id = p_user;
  delete from public.album_completions where user_id = p_user;
  delete from public.wishlists where user_id = p_user;
  delete from public.activity_feed where user_id = p_user;
  delete from public.booster_grants where user_id = p_user and opened_at is null;
  update public.profiles set last_free_booster_at = null, last_daily_bonus_at = null where id = p_user;

  -- Solde ramené au solde de départ, via le journal (jamais d'écriture directe)
  select coins into v_coins from public.profiles where id = p_user;
  if v_coins <> v_start then
    perform public._apply_coins(p_user, v_start - v_coins, 'admin_adjustment', 'Réinitialisation du compte');
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, 'admin', 'Ton compte a été réinitialisé', v_reason, '/');

  perform public._admin_log(p_user, v_name, 'reset_account',
    jsonb_build_object('cards_removed', v_cards, 'coins_before', v_coins, 'reason', v_reason));
  return jsonb_build_object('cards_removed', v_cards, 'coins_before', v_coins, 'coins_after', v_start);
end;
$$;

create function public.admin_set_ban(p_user uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_reason text := public._clean_reason(p_reason);
  v_ids uuid[];
begin
  v_name := public._admin_target(p_user, false);

  if p_banned then
    update public.profiles set banned_at = now(), ban_reason = v_reason where id = p_user;
    -- Connexion bloquée par le serveur d'authentification, sessions coupées
    update auth.users set banned_until = now() + interval '100 years' where id = p_user;
    delete from auth.sessions where user_id = p_user;

    select coalesce(array_agg(id), '{}') into v_ids from public.card_instances where owner_id = p_user and is_locked;
    perform public._release_instances(v_ids);
    update public.trades set status = 'cancelled', resolved_at = now()
    where status = 'pending' and (proposer_id = p_user or recipient_id = p_user);
  else
    update public.profiles set banned_at = null, ban_reason = null where id = p_user;
    update auth.users set banned_until = null where id = p_user;
  end if;

  perform public._admin_log(p_user, v_name, case when p_banned then 'ban' else 'unban' end,
    jsonb_build_object('reason', v_reason));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_give_boosters(uuid, int, int, text)', 'admin_give_cards(uuid, int, int, text)',
    'admin_adjust_coins(uuid, bigint, text)', 'admin_remove_cards(uuid[], text)',
    'admin_reset_account(uuid, text)', 'admin_set_ban(uuid, boolean, text)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
