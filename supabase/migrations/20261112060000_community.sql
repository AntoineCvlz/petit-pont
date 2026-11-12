-- =============================================================================
-- Phase 7 — Communauté : classements, vitrine, suggestions, notifications
-- =============================================================================

insert into public.app_settings (key, value, description) values
  ('rarity_weights', '{"commune":1,"rare":3,"epique":8,"legendaire":20,"iconique":50,"speciale":120}',
   'Poids de chaque rareté dans le score de rareté des classements')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Classements : statistiques par joueur et par période (semaine = 7 j glissants,
-- mois = 30 j glissants, tout temps). Vue matérialisée rafraîchie par pg_cron.
-- Sur une période, on compte ce qui a été obtenu / ouvert / complété pendant la période.
-- -----------------------------------------------------------------------------
create materialized view public.leaderboard_stats as
with periods(period, since) as (
  values ('week', now() - interval '7 days'), ('month', now() - interval '30 days'), ('all', '-infinity'::timestamptz)
),
total as (select count(*)::numeric as n from public.card_templates where is_active),
weights as (select public.get_setting('rarity_weights') as w)
select
  p.id as user_id,
  pr.period,
  coalesce(c.copies, 0)::int as cards,
  coalesce(c.distinct_cards, 0)::int as distinct_cards,
  case when (select n from total) > 0
       then round(coalesce(c.distinct_cards, 0) * 100.0 / (select n from total), 1) else 0 end as progression,
  coalesce(c.rarity_score, 0)::bigint as rarity_score,
  coalesce(a.albums, 0)::int as albums,
  coalesce(b.boosters, 0)::int as boosters,
  now() as refreshed_at
from public.profiles p
cross join periods pr
left join lateral (
  select count(*) as copies,
         count(distinct ci.template_id) as distinct_cards,
         sum(coalesce(((select w from weights) ->> ct.rarity::text)::int, 0)) as rarity_score
  from public.card_instances ci
  join public.card_templates ct on ct.id = ci.template_id
  where ci.owner_id = p.id and ci.obtained_at >= pr.since
) c on true
left join lateral (
  select count(*) as albums from public.album_completions ac where ac.user_id = p.id and ac.completed_at >= pr.since
) a on true
left join lateral (
  select count(*) as boosters from public.booster_openings bo where bo.user_id = p.id and bo.created_at >= pr.since
) b on true;

create unique index leaderboard_stats_pk on public.leaderboard_stats (user_id, period);
-- Statistiques publiques (pas de RLS sur une vue matérialisée) : lecture seule pour les joueurs connectés
revoke all on public.leaderboard_stats from anon, authenticated;
grant select on public.leaderboard_stats to authenticated;

-- Dernier top 10 connu par métrique (tout temps), pour détecter les nouvelles entrées
create table public.leaderboard_top10 (
  metric text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (metric, user_id)
);
alter table public.leaderboard_top10 enable row level security;
revoke all on public.leaderboard_top10 from anon, authenticated;

create function public._leaderboard_metrics()
returns text[]
language sql immutable
set search_path = ''
as $$ select array['progression', 'cards', 'albums', 'rarity_score', 'boosters'] $$;

-- Classement d'une métrique : rang (ex aequo = même rang), pseudo, valeur
create function public.get_leaderboard(p_metric text, p_period text default 'all', p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, value numeric, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (p_metric = any (public._leaderboard_metrics())) or p_period not in ('week', 'month', 'all') then
    raise exception 'Classement inconnu' using errcode = 'P0001';
  end if;
  return query execute format(
    $q$
      select r.rank, r.user_id, r.username, r.value, r.user_id = auth.uid()
      from (
        select rank() over (order by s.%1$I desc) as rank, s.user_id, p.username, s.%1$I::numeric as value
        from public.leaderboard_stats s
        join public.profiles p on p.id = s.user_id
        where s.period = $1
      ) r
      where r.rank <= $2 or r.user_id = auth.uid()
      order by r.rank, r.username
    $q$, p_metric)
  using p_period, least(greatest(p_limit, 1), 200);
end;
$$;

-- Rafraîchit les classements et publie les entrées dans un top 10 (tout temps)
create function public.refresh_leaderboards()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_metric text;
  v_events int := 0;
  v_n int;
begin
  refresh materialized view concurrently public.leaderboard_stats;

  foreach v_metric in array public._leaderboard_metrics() loop
    execute format(
      $q$
        with top as (
          select s.user_id from public.leaderboard_stats s
          where s.period = 'all' and s.%1$I > 0
          order by s.%1$I desc, s.user_id limit 10
        ),
        entered as (
          select t.user_id from top t
          where not exists (select 1 from public.leaderboard_top10 l where l.metric = $1 and l.user_id = t.user_id)
        ),
        published as (
          insert into public.activity_feed (user_id, type, payload)
          select e.user_id, 'leaderboard_top10', jsonb_build_object('metric', $1)
          from entered e join public.profiles p on p.id = e.user_id
          where not p.hide_activity
          returning 1
        ),
        cleared as (
          delete from public.leaderboard_top10 l where l.metric = $1 and l.user_id not in (select user_id from top)
          returning 1
        ),
        stored as (
          insert into public.leaderboard_top10 (metric, user_id) select $1, user_id from entered
          on conflict do nothing
          returning 1
        )
        select (select count(*) from published)::int + 0 * (select count(*) from cleared) + 0 * (select count(*) from stored)
      $q$, v_metric)
    into v_n using v_metric;
    v_events := v_events + v_n;
  end loop;
  return v_events;
end;
$$;

-- État initial : on mémorise le top 10 actuel sans publier d'événement
insert into public.leaderboard_top10 (metric, user_id)
select m, user_id from unnest(public._leaderboard_metrics()) m
cross join lateral (
  select s.user_id from public.leaderboard_stats s
  where s.period = 'all'
  order by case m when 'progression' then s.progression when 'cards' then s.cards when 'albums' then s.albums
                  when 'rarity_score' then s.rarity_score else s.boosters end desc, s.user_id
  limit 10
) t
on conflict do nothing;

select cron.schedule('petit-pont-refresh-leaderboards', '*/10 * * * *', $$select public.refresh_leaderboards()$$);

-- -----------------------------------------------------------------------------
-- Vitrine du profil : 5 exemplaires possédés et libres
-- -----------------------------------------------------------------------------
create function public.set_showcase(p_instance_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ids uuid[] := coalesce(p_instance_ids, '{}');
begin
  if v_uid is null then
    raise exception 'Connecte-toi' using errcode = 'P0001';
  end if;
  if cardinality(v_ids) > 5 then
    raise exception 'La vitrine contient 5 cartes au maximum' using errcode = 'P0001';
  end if;
  if (select count(distinct x) from unnest(v_ids) x) <> cardinality(v_ids) then
    raise exception 'Un exemplaire ne peut figurer qu''une fois' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(v_ids) x left join public.card_instances ci on ci.id = x
             where ci.id is null or ci.owner_id <> v_uid or ci.is_locked) then
    raise exception 'Une carte de la vitrine ne t''appartient pas ou est en vente' using errcode = 'P0001';
  end if;

  delete from public.profile_showcase where user_id = v_uid;
  insert into public.profile_showcase (user_id, slot, instance_id)
  select v_uid, ord, x from unnest(v_ids) with ordinality as u(x, ord);
end;
$$;

-- -----------------------------------------------------------------------------
-- Suggestions : joueurs qui ont en double (exemplaires libres) des cartes de ma liste de souhaits
-- -----------------------------------------------------------------------------
create function public.wishlist_matches(p_limit int default 10)
returns table (user_id uuid, username text, template_ids int[], matches int)
language sql
stable
security definer
set search_path = ''
as $$
  select ci.owner_id, p.username, array_agg(distinct ci.template_id), count(distinct ci.template_id)::int
  from public.wishlists w
  join public.card_instances ci on ci.template_id = w.template_id and ci.owner_id <> w.user_id and not ci.is_locked
  join public.profiles p on p.id = ci.owner_id
  where w.user_id = auth.uid()
    and not exists (select 1 from public.blocks b where (b.blocker_id = ci.owner_id and b.blocked_id = auth.uid())
                                                 or (b.blocker_id = auth.uid() and b.blocked_id = ci.owner_id))
    and (select count(*) from public.card_instances c2 where c2.owner_id = ci.owner_id and c2.template_id = ci.template_id) > 1
  group by ci.owner_id, p.username
  order by count(distinct ci.template_id) desc, p.username
  limit least(greatest(p_limit, 1), 50)
$$;

-- -----------------------------------------------------------------------------
-- Notifications : tout marquer comme lu
-- -----------------------------------------------------------------------------
create function public.mark_all_notifications_read()
returns int
language sql
volatile
security definer
set search_path = ''
as $$
  with updated as (
    update public.notifications set is_read = true where user_id = auth.uid() and not is_read returning 1
  )
  select count(*)::int from updated
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public._leaderboard_metrics() from public, anon, authenticated;
revoke execute on function public.refresh_leaderboards() from public, anon, authenticated;
revoke execute on function public.get_leaderboard(text, text, int) from public, anon;
revoke execute on function public.set_showcase(uuid[]) from public, anon;
revoke execute on function public.wishlist_matches(int) from public, anon;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.get_leaderboard(text, text, int) to authenticated;
grant execute on function public.set_showcase(uuid[]) to authenticated;
grant execute on function public.wishlist_matches(int) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
