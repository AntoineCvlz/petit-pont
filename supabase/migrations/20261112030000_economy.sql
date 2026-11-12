-- =============================================================================
-- Phase 4 — Économie : bonus quotidien, revente groupée des doublons
-- =============================================================================

insert into public.app_settings (key, value, description) values
  ('timezone', '"Europe/Paris"', 'Fuseau horaire de référence pour le bonus quotidien')
on conflict (key) do nothing;

create function public._game_timezone()
returns text
language sql stable
security definer
set search_path = ''
as $$
  select coalesce(public.get_setting('timezone') #>> '{}', 'Europe/Paris')
$$;

-- -----------------------------------------------------------------------------
-- Bonus quotidien : une fois par jour calendaire (fuseau du jeu)
-- -----------------------------------------------------------------------------
create function public.daily_bonus_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := public._game_timezone();
  v_last timestamptz;
  v_amount bigint := coalesce((public.get_setting('daily_bonus'))::bigint, 0);
  v_next timestamptz;
begin
  select last_daily_bonus_at into v_last from public.profiles where id = auth.uid();
  if v_last is null or (v_last at time zone v_tz)::date < (now() at time zone v_tz)::date then
    return jsonb_build_object('available', true, 'amount', v_amount);
  end if;
  v_next := ((now() at time zone v_tz)::date + 1)::timestamp at time zone v_tz;
  return jsonb_build_object('available', false, 'amount', v_amount, 'next_at', v_next);
end;
$$;

create function public.claim_daily_bonus()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := public._game_timezone();
  v_amount bigint := coalesce((public.get_setting('daily_bonus'))::bigint, 0);
  p public.profiles%rowtype;
  v_balance bigint;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour récupérer ton bonus' using errcode = 'P0001';
  end if;

  select * into p from public.profiles where id = v_uid for update;
  if p.last_daily_bonus_at is not null
     and (p.last_daily_bonus_at at time zone v_tz)::date >= (now() at time zone v_tz)::date then
    raise exception 'Bonus du jour déjà récupéré, reviens demain !' using errcode = 'P0001';
  end if;

  update public.profiles set last_daily_bonus_at = now() where id = v_uid;
  v_balance := public._apply_coins(v_uid, v_amount, 'daily_bonus', 'Bonus de connexion quotidien');
  return jsonb_build_object('amount', v_amount, 'balance', v_balance);
end;
$$;

-- -----------------------------------------------------------------------------
-- Revente groupée : tous les doublons libres jusqu'à une rareté donnée.
-- Pour chaque carte, on garde l'exemplaire libre au plus petit numéro de série ;
-- les exemplaires verrouillés (vente / échange) ne sont jamais vendus.
-- -----------------------------------------------------------------------------
create function public.sell_all_duplicates(p_max_rarity public.rarity default 'epique')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_res jsonb;
  v_sold int := 0;
  v_coins bigint := 0;
  v_balance bigint;
  i int := 1;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour revendre' using errcode = 'P0001';
  end if;

  select coins into v_balance from public.profiles where id = v_uid for update;

  select coalesce(array_agg(id order by id), '{}') into v_ids
  from (
    select ci.id,
           row_number() over (partition by ci.template_id order by ci.serial_number) as rn
    from public.card_instances ci
    join public.card_templates ct on ct.id = ci.template_id
    where ci.owner_id = v_uid
      and not ci.is_locked
      and public.rarity_rank(ct.rarity) <= public.rarity_rank(p_max_rarity)
  ) x
  where rn > 1;

  -- Lots de 200 (limite de sell_duplicates), dans la même transaction
  while i <= cardinality(v_ids) loop
    v_res := public.sell_duplicates(v_ids[i : i + 199]);
    v_sold := v_sold + (v_res ->> 'sold')::int;
    v_coins := v_coins + (v_res ->> 'coins')::bigint;
    v_balance := (v_res ->> 'balance')::bigint;
    i := i + 200;
  end loop;

  return jsonb_build_object('sold', v_sold, 'coins', v_coins, 'balance', v_balance);
end;
$$;

revoke execute on function public._game_timezone() from public, anon, authenticated;
revoke execute on function public.daily_bonus_status() from public, anon;
revoke execute on function public.claim_daily_bonus() from public, anon;
revoke execute on function public.sell_all_duplicates(public.rarity) from public, anon;
grant execute on function public.daily_bonus_status() to authenticated;
grant execute on function public.claim_daily_bonus() to authenticated;
grant execute on function public.sell_all_duplicates(public.rarity) to authenticated;
