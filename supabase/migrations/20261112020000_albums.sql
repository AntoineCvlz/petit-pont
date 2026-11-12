-- =============================================================================
-- Phase 3 — Albums : progression et récompense de complétion (une seule fois)
-- =============================================================================

-- Progression d'un joueur sur un album : emplacements remplis / total.
-- Une carte compte dès qu'on en possède au moins un exemplaire (même en vente).
create function public.album_progress(p_user uuid, p_album int)
returns table (owned int, total int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where exists (
      select 1 from public.card_instances ci where ci.owner_id = p_user and ci.template_id = s.template_id))::int,
    count(*)::int
  from public.album_slots s
  where s.album_id = p_album
$$;

-- -----------------------------------------------------------------------------
-- claim_album_reward : vérifie la complétion côté serveur, crédite la récompense
-- une seule fois (verrou du profil + clé primaire album_completions),
-- publie l'événement dans le fil d'activité.
-- -----------------------------------------------------------------------------
create function public.claim_album_reward(p_album_id int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  a public.albums%rowtype;
  p public.profiles%rowtype;
  v_owned int;
  v_total int;
  v_balance bigint;
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour réclamer une récompense' using errcode = 'P0001';
  end if;

  select * into a from public.albums where id = p_album_id and is_active;
  if not found then
    raise exception 'Album introuvable' using errcode = 'P0001';
  end if;

  -- Sérialise les réclamations du joueur (double clic, onglets multiples)
  select * into p from public.profiles where id = v_uid for update;

  if exists (select 1 from public.album_completions where user_id = v_uid and album_id = a.id) then
    raise exception 'Récompense déjà réclamée pour cet album' using errcode = 'P0001';
  end if;

  select owned, total into v_owned, v_total from public.album_progress(v_uid, a.id);
  if v_total = 0 or v_owned < v_total then
    raise exception 'Album incomplet : il manque % carte(s)', v_total - v_owned using errcode = 'P0001';
  end if;

  insert into public.album_completions (user_id, album_id, reward_coins) values (v_uid, a.id, a.reward_coins);

  if a.reward_coins > 0 then
    v_balance := public._apply_coins(v_uid, a.reward_coins, 'album_reward', 'Album complété : ' || a.name, 'album', a.id::text);
  else
    v_balance := p.coins;
  end if;

  if not p.hide_activity then
    insert into public.activity_feed (user_id, type, album_id, payload)
    values (v_uid, 'album_completed', a.id, jsonb_build_object('reward', a.reward_coins));
  end if;

  return jsonb_build_object('reward', a.reward_coins, 'balance', v_balance);
end;
$$;

revoke execute on function public.album_progress(uuid, int) from public, anon;
grant execute on function public.album_progress(uuid, int) to authenticated;
revoke execute on function public.claim_album_reward(int) from public, anon;
grant execute on function public.claim_album_reward(int) to authenticated;
