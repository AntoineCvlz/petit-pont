-- =============================================================================
-- Phase 8 — Administration et modération
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rôle admin : lu dans raw_app_meta_data (non modifiable par l'utilisateur à l'inscription)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_is_demo boolean := coalesce((new.raw_app_meta_data ->> 'is_demo')::boolean, false);
  v_is_admin boolean := coalesce((new.raw_app_meta_data ->> 'is_admin')::boolean, false);
  v_problem text;
  v_start bigint;
begin
  v_problem := public.username_problem(v_username);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;

  insert into public.profiles (id, username, is_demo, is_admin) values (new.id, v_username, v_is_demo, v_is_admin);

  v_start := coalesce((public.get_setting('starting_balance'))::bigint, 0);
  if v_start > 0 then
    perform public._apply_coins(new.id, v_start, 'starting_balance', 'Solde de bienvenue');
  end if;
  return new;
end;
$$;

-- Le « premier vrai compte » ignore les comptes de démo et les administrateurs
create or replace function public.welcome_first_real_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  v_trade uuid;
begin
  if new.is_demo or new.is_admin
     or exists (select 1 from public.profiles where not is_demo and not is_admin and id <> new.id) then
    return new;
  end if;

  for d in
    select distinct on (ci.owner_id) ci.owner_id, ci.id as instance_id, ct.rarity
    from public.card_instances ci
    join public.card_templates ct on ct.id = ci.template_id
    join public.profiles p on p.id = ci.owner_id and p.is_demo
    where not ci.is_locked
      and (select count(*) from public.card_instances c2 where c2.owner_id = ci.owner_id and c2.template_id = ci.template_id) > 1
    order by ci.owner_id, public.rarity_rank(ct.rarity) desc
    limit 3
  loop
    insert into public.trades (proposer_id, recipient_id, recipient_coins, message, expires_at)
    values (d.owner_id, new.id,
            case d.rarity when 'commune' then 40 when 'rare' then 120 when 'epique' then 300 else 800 end,
            'Bienvenue au club ! Un doublon contre quelques pièces ?',
            now() + interval '7 days')
    returning id into v_trade;
    insert into public.trade_items (trade_id, instance_id, from_user_id) values (v_trade, d.instance_id, d.owner_id);
    insert into public.notifications (user_id, type, title, body, link)
    values (new.id, 'trade_received', 'Proposition d''échange',
            (select username from public.profiles where id = d.owner_id) || ' te propose un échange.', '/echanges');
  end loop;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Écritures admin sur le référentiel (RLS + droits par colonne)
-- -----------------------------------------------------------------------------
grant insert, update, delete on public.nations, public.clubs, public.players, public.player_clubs,
  public.albums, public.booster_cards to authenticated;
grant insert, delete on public.card_templates, public.boosters to authenticated;
-- minted_count (numéros de série) et stock_remaining hors création ne sont jamais modifiables à la main
grant update (player_id, club_id, season, edition, rarity, rating, max_supply, image_url, is_active)
  on public.card_templates to authenticated;
grant update (name, description, price, cards_count, guarantee_rarity, guarantee_count, starts_at, ends_at,
  stock_total, stock_remaining, image_url, is_active, sort_order)
  on public.boosters to authenticated;
grant update (value, updated_at) on public.app_settings to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['nations', 'clubs', 'players', 'player_clubs', 'card_templates', 'boosters',
                           'booster_cards', 'albums']
  loop
    execute format('create policy "Admin : création" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "Admin : modification" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "Admin : suppression" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;
create policy "Admin : modification" on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Nouvelle carte : numéro de collection attribué automatiquement
create function public.card_templates_assign_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.collection_number is null or new.collection_number <= 0 then
    perform pg_advisory_xact_lock(hashtext('card_templates_collection_number'));
    select coalesce(max(collection_number), 0) + 1 into new.collection_number from public.card_templates;
  end if;
  new.minted_count := 0;
  return new;
end;
$$;
alter table public.card_templates alter column collection_number drop not null;
create trigger card_templates_assign_number
  before insert on public.card_templates
  for each row execute function public.card_templates_assign_number();
alter table public.card_templates add constraint collection_number_set check (collection_number is not null);

-- Tirage limité : jamais en dessous du nombre déjà édité
alter table public.card_templates add constraint max_supply_not_below_minted
  check (max_supply is null or max_supply >= minted_count);

-- -----------------------------------------------------------------------------
-- Probabilités d'un booster : remplacement complet dans une transaction (total = 100 %)
-- -----------------------------------------------------------------------------
create function public.admin_set_booster_odds(p_booster_id int, p_odds jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_total numeric;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if not exists (select 1 from public.boosters where id = p_booster_id) then
    raise exception 'Booster introuvable' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_each_text(p_odds) e
             where e.key not in ('commune', 'rare', 'epique', 'legendaire', 'iconique', 'speciale')
                or e.value !~ '^\d+(\.\d{1,2})?$' or e.value::numeric > 100) then
    raise exception 'Probabilités invalides (0 à 100, 2 décimales max)' using errcode = 'P0001';
  end if;
  select coalesce(sum(value::numeric), 0) into v_total from jsonb_each_text(p_odds);
  if v_total <> 100 then
    raise exception 'Le total des probabilités doit faire 100 %% (actuellement % %%)', v_total using errcode = 'P0001';
  end if;

  delete from public.booster_odds where booster_id = p_booster_id;
  insert into public.booster_odds (booster_id, rarity, probability)
  select p_booster_id, key::public.rarity, value::numeric from jsonb_each_text(p_odds) where value::numeric > 0;
end;
$$;

-- -----------------------------------------------------------------------------
-- Emplacements d'un album : liste ordonnée de numéros de collection
-- -----------------------------------------------------------------------------
create function public.admin_set_album_slots(p_album_id int, p_collection_numbers int[])
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_missing int[];
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if not exists (select 1 from public.albums where id = p_album_id) then
    raise exception 'Album introuvable' using errcode = 'P0001';
  end if;
  if (select count(distinct x) from unnest(p_collection_numbers) x) <> cardinality(p_collection_numbers) then
    raise exception 'Une carte figure deux fois dans l''album' using errcode = 'P0001';
  end if;
  select array_agg(x) into v_missing from unnest(p_collection_numbers) x
  where not exists (select 1 from public.card_templates ct where ct.collection_number = x);
  if v_missing is not null then
    raise exception 'Numéros de collection inconnus : %', array_to_string(v_missing, ', ') using errcode = 'P0001';
  end if;

  delete from public.album_slots where album_id = p_album_id;
  insert into public.album_slots (album_id, slot_number, template_id)
  select p_album_id, ord, ct.id
  from unnest(p_collection_numbers) with ordinality as u(num, ord)
  join public.card_templates ct on ct.collection_number = u.num;
  return cardinality(p_collection_numbers);
end;
$$;

-- -----------------------------------------------------------------------------
-- Statistiques de l'économie
-- -----------------------------------------------------------------------------
create function public.admin_economy_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'demo_players', (select count(*) from public.profiles where is_demo),
    'active_7d', (select count(distinct user_id) from public.coin_transactions where created_at > now() - interval '7 days'),
    'coins_in_circulation', (select coalesce(sum(coins), 0) from public.profiles),
    'coins_by_type', (select coalesce(jsonb_object_agg(type, total), '{}') from (
        select type::text, sum(amount) as total from public.coin_transactions group by type) x),
    'market_fees_burned', (select coalesce(sum(fee), 0) from public.market_sales),
    'market_sales', (select count(*) from public.market_sales),
    'market_volume', (select coalesce(sum(price), 0) from public.market_sales),
    'active_listings', (select count(*) from public.market_listings where status = 'active'),
    'openings_by_booster', (select coalesce(jsonb_object_agg(b.name, x.n), '{}') from (
        select booster_id, count(*) as n from public.booster_openings group by booster_id) x
        join public.boosters b on b.id = x.booster_id),
    'cards_minted', (select count(*) from public.card_instances),
    'cards_by_rarity', (select coalesce(jsonb_object_agg(rarity, n), '{}') from (
        select ct.rarity::text, count(*) as n from public.card_instances ci
        join public.card_templates ct on ct.id = ci.template_id group by ct.rarity) x),
    'trades_accepted', (select count(*) from public.trades where status = 'accepted'),
    'trades_pending', (select count(*) from public.trades where status = 'pending' and expires_at > now()),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'inconsistent_balances', (select count(*) from public.coin_balance_audit where not is_consistent)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Suppression des comptes de démo (d'un clic depuis l'admin)
-- -----------------------------------------------------------------------------
create function public.admin_purge_demo_accounts()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  -- Seule exception à l'immuabilité du journal : purge des comptes de démo
  perform set_config('petit_pont.allow_purge', 'on', true);
  with deleted as (
    delete from auth.users u
    using public.profiles p
    where p.id = u.id and p.is_demo and not p.is_admin
    returning 1
  )
  select count(*) into v_count from deleted;
  perform set_config('petit_pont.allow_purge', 'off', true);

  refresh materialized view public.leaderboard_stats;
  delete from public.leaderboard_top10 l where not exists (select 1 from public.profiles p where p.id = l.user_id);
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Modération : signalement, blocage
-- -----------------------------------------------------------------------------
create function public.report_player(p_reported uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null then
    raise exception 'Connecte-toi' using errcode = 'P0001';
  end if;
  if p_reported = v_uid or not exists (select 1 from public.profiles where id = p_reported) then
    raise exception 'Joueur introuvable' using errcode = 'P0001';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'Explique en quelques mots (3 à 500 caractères)' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reports where reporter_id = v_uid and reported_id = p_reported and status = 'open') then
    raise exception 'Tu as déjà signalé ce joueur, la modération va regarder' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, reported_id, reason) values (v_uid, p_reported, v_reason);
end;
$$;

create function public.admin_resolve_report(p_report_id bigint, p_status public.report_status)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if p_status = 'open' then
    raise exception 'Statut invalide' using errcode = 'P0001';
  end if;
  update public.reports set status = p_status, resolved_at = now() where id = p_report_id;
  if not found then
    raise exception 'Signalement introuvable' using errcode = 'P0001';
  end if;
end;
$$;

create function public.block_player(p_blocked uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_blocked = v_uid or not exists (select 1 from public.profiles where id = p_blocked) then
    raise exception 'Joueur introuvable' using errcode = 'P0001';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_blocked) on conflict do nothing;
  -- Les échanges en attente entre les deux joueurs sont annulés
  update public.trades set status = 'cancelled', resolved_at = now()
  where status = 'pending'
    and ((proposer_id = v_uid and recipient_id = p_blocked) or (proposer_id = p_blocked and recipient_id = v_uid));
end;
$$;

create function public.unblock_player(p_blocked uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_blocked
$$;

-- Les admins lisent tous les signalements
create policy "Admin : lecture des signalements" on public.reports for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public.admin_set_booster_odds(int, jsonb) from public, anon;
revoke execute on function public.admin_set_album_slots(int, int[]) from public, anon;
revoke execute on function public.admin_economy_stats() from public, anon;
revoke execute on function public.admin_purge_demo_accounts() from public, anon;
revoke execute on function public.admin_resolve_report(bigint, public.report_status) from public, anon;
revoke execute on function public.report_player(uuid, text) from public, anon;
revoke execute on function public.block_player(uuid) from public, anon;
revoke execute on function public.unblock_player(uuid) from public, anon;
grant execute on function public.admin_set_booster_odds(int, jsonb) to authenticated;
grant execute on function public.admin_set_album_slots(int, int[]) to authenticated;
grant execute on function public.admin_economy_stats() to authenticated;
grant execute on function public.admin_purge_demo_accounts() to authenticated;
grant execute on function public.admin_resolve_report(bigint, public.report_status) to authenticated;
grant execute on function public.report_player(uuid, text) to authenticated;
grant execute on function public.block_player(uuid) to authenticated;
grant execute on function public.unblock_player(uuid) to authenticated;
