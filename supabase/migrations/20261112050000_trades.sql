-- =============================================================================
-- Phase 6 — Échanges entre joueurs
-- Aucun verrouillage à la proposition (pas de blocage des cartes d'autrui) :
-- l'acceptation revérifie propriété, absence de mise en vente et soldes,
-- puis échange tout dans une seule transaction.
-- =============================================================================

insert into public.app_settings (key, value, description) values
  ('trade_max_items_per_side', '10', 'Nombre maximum d''exemplaires de chaque côté d''un échange'),
  ('trade_max_pending', '20', 'Nombre maximum de propositions en attente envoyées par joueur')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- propose_trade (et contre-proposition via p_parent)
-- -----------------------------------------------------------------------------
create function public.propose_trade(
  p_recipient uuid,
  p_offered uuid[] default '{}',
  p_requested uuid[] default '{}',
  p_proposer_coins bigint default 0,
  p_recipient_coins bigint default 0,
  p_message text default null,
  p_parent uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_offered uuid[] := coalesce(p_offered, '{}');
  v_requested uuid[] := coalesce(p_requested, '{}');
  v_max_items int := coalesce((public.get_setting('trade_max_items_per_side'))::int, 10);
  v_max_pending int := coalesce((public.get_setting('trade_max_pending'))::int, 20);
  v_days int := coalesce((public.get_setting('trade_expiry_days'))::int, 7);
  v_trade uuid;
  v_name text;
  parent public.trades%rowtype;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour proposer un échange' using errcode = 'P0001';
  end if;
  if p_recipient is null or p_recipient = v_uid then
    raise exception 'Choisis un autre joueur' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_recipient) then
    raise exception 'Joueur introuvable' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.blocks where (blocker_id = p_recipient and blocked_id = v_uid)
                                         or (blocker_id = v_uid and blocked_id = p_recipient)) then
    raise exception 'Échange impossible avec ce joueur' using errcode = 'P0001';
  end if;

  if cardinality(v_offered) + cardinality(v_requested) = 0 then
    raise exception 'Un échange doit contenir au moins une carte' using errcode = 'P0001';
  end if;
  if cardinality(v_offered) > v_max_items or cardinality(v_requested) > v_max_items then
    raise exception 'Maximum % cartes de chaque côté', v_max_items using errcode = 'P0001';
  end if;
  if (select count(distinct x) from unnest(v_offered || v_requested) x) <> cardinality(v_offered) + cardinality(v_requested) then
    raise exception 'Un exemplaire ne peut figurer qu''une fois' using errcode = 'P0001';
  end if;
  if coalesce(p_proposer_coins, 0) < 0 or coalesce(p_recipient_coins, 0) < 0
     or coalesce(p_proposer_coins, 0) > 1000000 or coalesce(p_recipient_coins, 0) > 1000000 then
    raise exception 'Montant de pièces invalide' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_message, '')) > 280 then
    raise exception 'Message trop long (280 caractères max)' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_uid for update;

  if p_proposer_coins > (select coins from public.profiles where id = v_uid) then
    raise exception 'Tu n''as pas assez de pièces pour cette offre' using errcode = 'P0001';
  end if;
  if (select count(*) from public.trades where proposer_id = v_uid and status = 'pending' and expires_at > now()) >= v_max_pending then
    raise exception 'Tu as déjà % propositions en attente', v_max_pending using errcode = 'P0001';
  end if;

  if exists (select 1 from unnest(v_offered) x
             left join public.card_instances ci on ci.id = x
             where ci.id is null or ci.owner_id <> v_uid or ci.is_locked) then
    raise exception 'Une de tes cartes n''est plus disponible (vendue, en vente ou échangée)' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(v_requested) x
             left join public.card_instances ci on ci.id = x
             where ci.id is null or ci.owner_id <> p_recipient or ci.is_locked) then
    raise exception 'Une carte demandée n''est plus disponible chez ce joueur' using errcode = 'P0001';
  end if;

  -- Contre-proposition : la proposition d'origine doit m'être adressée et être en attente
  if p_parent is not null then
    select * into parent from public.trades where id = p_parent for update;
    if not found or parent.recipient_id <> v_uid or parent.proposer_id <> p_recipient or parent.status <> 'pending' then
      raise exception 'Cette proposition ne peut plus être contre-proposée' using errcode = 'P0001';
    end if;
    update public.trades set status = 'countered', resolved_at = now() where id = parent.id;
  end if;

  insert into public.trades (proposer_id, recipient_id, proposer_coins, recipient_coins, message, parent_trade_id, expires_at)
  values (v_uid, p_recipient, coalesce(p_proposer_coins, 0), coalesce(p_recipient_coins, 0),
          nullif(btrim(p_message), ''), p_parent, now() + make_interval(days => v_days))
  returning id into v_trade;

  insert into public.trade_items (trade_id, instance_id, from_user_id)
  select v_trade, x, v_uid from unnest(v_offered) x
  union all
  select v_trade, x, p_recipient from unnest(v_requested) x;

  select username into v_name from public.profiles where id = v_uid;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_recipient, case when p_parent is null then 'trade_received' else 'trade_countered' end,
          case when p_parent is null then 'Proposition d''échange' else 'Contre-proposition' end,
          v_name || case when p_parent is null then ' te propose un échange.' else ' a fait une contre-proposition.' end,
          '/echanges');
  return v_trade;
end;
$$;

-- -----------------------------------------------------------------------------
-- accept_trade : échange atomique
-- -----------------------------------------------------------------------------
create function public.accept_trade(p_trade_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  t public.trades%rowtype;
  v_bad int;
  v_name text;
  v_moved uuid[];
  r record;
begin
  select * into t from public.trades where id = p_trade_id for update;
  if not found or t.recipient_id is distinct from v_uid then
    raise exception 'Proposition introuvable' using errcode = 'P0001';
  end if;
  if t.status <> 'pending' then
    raise exception 'Cette proposition n''est plus en attente' using errcode = 'P0001';
  end if;
  if t.expires_at <= now() then
    raise exception 'Cette proposition a expiré' using errcode = 'P0001';
  end if;

  -- Verrous dans un ordre fixe : profils puis exemplaires
  perform 1 from public.profiles where id in (t.proposer_id, t.recipient_id) order by id for update;
  perform 1 from public.card_instances ci
  where ci.id in (select instance_id from public.trade_items where trade_id = t.id)
  order by ci.id for update;

  -- Revérification : chaque exemplaire existe, appartient toujours au bon joueur et n'est pas en vente
  select count(*) into v_bad
  from public.trade_items ti
  left join public.card_instances ci on ci.id = ti.instance_id
  where ti.trade_id = t.id and (ci.id is null or ci.owner_id <> ti.from_user_id or ci.is_locked);
  if v_bad > 0 then
    raise exception 'Échange impossible : une carte n''est plus disponible (vendue, en vente ou déjà échangée)' using errcode = 'P0001';
  end if;

  -- Pièces (solde insuffisant = échec de toute la transaction)
  if t.proposer_coins > 0 then
    perform public._apply_coins(t.proposer_id, -t.proposer_coins, 'trade_sent', 'Échange', 'trade', t.id::text);
    perform public._apply_coins(t.recipient_id, t.proposer_coins, 'trade_received', 'Échange', 'trade', t.id::text);
  end if;
  if t.recipient_coins > 0 then
    perform public._apply_coins(t.recipient_id, -t.recipient_coins, 'trade_sent', 'Échange', 'trade', t.id::text);
    perform public._apply_coins(t.proposer_id, t.recipient_coins, 'trade_received', 'Échange', 'trade', t.id::text);
  end if;

  -- Transfert des exemplaires
  for r in select instance_id, from_user_id from public.trade_items where trade_id = t.id loop
    update public.card_instances
    set owner_id = case when r.from_user_id = t.proposer_id then t.recipient_id else t.proposer_id end,
        obtained_via = 'trade', obtained_at = now()
    where id = r.instance_id;
    insert into public.card_instance_history (instance_id, event, from_user_id, to_user_id)
    values (r.instance_id, 'trade', r.from_user_id,
            case when r.from_user_id = t.proposer_id then t.recipient_id else t.proposer_id end);
    delete from public.profile_showcase where instance_id = r.instance_id;
  end loop;

  update public.trades set status = 'accepted', resolved_at = now() where id = t.id;

  -- Les autres propositions en attente portant sur ces exemplaires deviennent caduques
  select array_agg(instance_id) into v_moved from public.trade_items where trade_id = t.id;
  update public.trades o set status = 'cancelled', resolved_at = now()
  where o.status = 'pending' and o.id <> t.id
    and exists (select 1 from public.trade_items oi where oi.trade_id = o.id and oi.instance_id = any (v_moved));

  select username into v_name from public.profiles where id = t.recipient_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (t.proposer_id, 'trade_accepted', 'Échange accepté !', v_name || ' a accepté ton échange.', '/echanges?onglet=termines');
end;
$$;

-- -----------------------------------------------------------------------------
-- decline_trade / cancel_trade
-- -----------------------------------------------------------------------------
create function public.decline_trade(p_trade_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  t public.trades%rowtype;
  v_name text;
begin
  select * into t from public.trades where id = p_trade_id for update;
  if not found or t.recipient_id is distinct from auth.uid() then
    raise exception 'Proposition introuvable' using errcode = 'P0001';
  end if;
  if t.status <> 'pending' then
    raise exception 'Cette proposition n''est plus en attente' using errcode = 'P0001';
  end if;
  update public.trades set status = 'declined', resolved_at = now() where id = t.id;
  select username into v_name from public.profiles where id = t.recipient_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (t.proposer_id, 'trade_declined', 'Échange refusé', v_name || ' a refusé ton échange.', '/echanges?onglet=termines');
end;
$$;

create function public.cancel_trade(p_trade_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  t public.trades%rowtype;
begin
  select * into t from public.trades where id = p_trade_id for update;
  if not found or t.proposer_id is distinct from auth.uid() then
    raise exception 'Proposition introuvable' using errcode = 'P0001';
  end if;
  if t.status <> 'pending' then
    raise exception 'Cette proposition n''est plus en attente' using errcode = 'P0001';
  end if;
  update public.trades set status = 'cancelled', resolved_at = now() where id = t.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Expiration automatique (7 jours) : tâche horaire pg_cron
-- -----------------------------------------------------------------------------
create function public.expire_trades()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  with expired as (
    update public.trades set status = 'expired', resolved_at = now()
    where status = 'pending' and expires_at <= now()
    returning proposer_id
  ),
  notified as (
    insert into public.notifications (user_id, type, title, body, link)
    select proposer_id, 'trade_expired', 'Échange expiré', 'Une de tes propositions a expiré sans réponse.', '/echanges?onglet=termines'
    from expired
    returning 1
  )
  select count(*) into v_count from notified;
  return v_count;
end;
$$;

create extension if not exists pg_cron;
select cron.schedule('petit-pont-expire-trades', '7 * * * *', $$select public.expire_trades()$$);

-- -----------------------------------------------------------------------------
-- Comptes de démo : propositions d'échange vers le premier vrai compte inscrit
-- -----------------------------------------------------------------------------
create function public.welcome_first_real_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  v_trade uuid;
begin
  if new.is_demo or exists (select 1 from public.profiles where not is_demo and id <> new.id) then
    return new;
  end if;

  -- Trois joueurs de démo proposent chacun un de leurs doublons contre des pièces
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

-- Déclenché à la création de chaque profil (via handle_new_user à l'inscription)
create trigger welcome_first_real_player
  after insert on public.profiles
  for each row execute function public.welcome_first_real_player();

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public.propose_trade(uuid, uuid[], uuid[], bigint, bigint, text, uuid) from public, anon;
revoke execute on function public.accept_trade(uuid) from public, anon;
revoke execute on function public.decline_trade(uuid) from public, anon;
revoke execute on function public.cancel_trade(uuid) from public, anon;
revoke execute on function public.expire_trades() from public, anon, authenticated;
grant execute on function public.propose_trade(uuid, uuid[], uuid[], bigint, bigint, text, uuid) to authenticated;
grant execute on function public.accept_trade(uuid) to authenticated;
grant execute on function public.decline_trade(uuid) to authenticated;
grant execute on function public.cancel_trade(uuid) to authenticated;
