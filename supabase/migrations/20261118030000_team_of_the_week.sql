-- =============================================================================
-- Équipe de la semaine : chaque mercredi 19h (heure de Paris), 11 joueurs choisis d'après leurs performances réelles
-- de la semaine écoulée (football-data.org : buts, passes décisives, clean sheets, victoires), calculées par
-- l'application (/api/cron/totw) puis publiées ici : cartes boostées selon la performance, booster dédié 7 jours,
-- pack offert, annonce. La tâche planifiée appelle l'application (pg_net) jusqu'à publication (au plus toutes les 20 min).
-- =============================================================================

create table public.event_calls (
  job text not null,
  slot timestamptz not null,
  called_at timestamptz not null default now()
);
alter table public.event_calls enable row level security;  -- aucune politique : invisible depuis l'API

-- Créneau de l'équipe de la semaine à publier (dernier mercredi 19h), ou null si déjà publiée / trop ancienne
create function public.totw_due()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select s from (select public._last_slot(3) as s) x
  where now() < s + interval '24 hours'
    and not exists (select 1 from public.game_events where kind = 'totw' and slot = x.s);
$$;

-- Publication (clé de service uniquement) : p_picks = [{"template_id": n, "boost": n, "reason": "2 buts"}, …]
create function public.publish_totw(p_slot timestamptz, p_period text, p_picks jsonb)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_event int;
  v_n int;
begin
  if p_slot is distinct from public.totw_due() then
    raise exception 'Équipe de la semaine déjà publiée ou hors créneau' using errcode = 'P0001';
  end if;
  if jsonb_array_length(coalesce(p_picks, '[]')) < 5 then
    raise exception 'Sélection incomplète' using errcode = 'P0001';
  end if;

  insert into public.game_events (kind, theme, name, tagline, color, slot, starts_at, ends_at)
  values ('totw', null, 'Équipe de la semaine',
          'Les meilleurs joueurs de la semaine (' || p_period || ') d''après leurs matchs réels.',
          '#f5c84c', p_slot, now(), p_slot + interval '7 days')
  returning id into v_event;

  insert into public.card_templates (player_id, club_id, season, edition, rarity, rating, collection_number, max_supply,
                                     event_id, stats)
  select ct.player_id, ct.club_id, 'Semaine du ' || p_period, 'Équipe de la semaine',
         case when least(99, ct.rating + x.boost) >= 88 then 'legendaire' else 'epique' end::public.rarity,
         least(99, ct.rating + x.boost),
         (select coalesce(max(collection_number), 0) from public.card_templates) + row_number() over (order by ct.rating desc, ct.id),
         40, v_event, public._boost_stats(p.stats, x.boost, '{}')
  from jsonb_to_recordset(p_picks) as x(template_id int, boost int, reason text)
  join public.card_templates ct on ct.id = x.template_id and ct.is_active and ct.edition = 'Base'
  join public.players p on p.id = ct.player_id
  where x.boost between 1 and 10;
  get diagnostics v_n = row_count;
  if v_n < 5 then
    raise exception 'Sélection invalide' using errcode = 'P0001';
  end if;

  perform public._open_event_booster(v_event, 'equipe-semaine-' || v_event, 600);
  perform public._discord_announce(
    'Équipe de la semaine',
    'Les ' || v_n || ' joueurs les plus en forme de la semaine (' || p_period || ') ont leur carte boostée. Un pack offert à chacun !',
    16107596);
  return v_event;
end;
$$;

-- Tâche planifiée : vendredi (événement) + mercredi (appel de l'application pour l'équipe de la semaine)
create or replace function public.events_tick()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_friday timestamptz := public._last_slot(5);
  v_totw timestamptz := public.totw_due();
  v_site text := coalesce(public.get_setting('site_url') #>> '{}', '');
begin
  if now() < v_friday + interval '24 hours'
     and not exists (select 1 from public.game_events where kind = 'weekly' and slot = v_friday) then
    perform public.launch_weekly_event(null, v_friday);
  end if;

  if v_totw is not null and v_site <> ''
     and not exists (select 1 from public.event_calls
                     where job = 'totw' and slot = v_totw and called_at > now() - interval '20 minutes') then
    insert into public.event_calls (job, slot) values ('totw', v_totw);
    perform net.http_post(url := v_site || '/api/cron/totw', body := '{}'::jsonb,
                          headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 1000);
  end if;
exception when others then
  raise warning 'events_tick : %', sqlerrm;
end;
$$;

revoke execute on function public.totw_due() from public, anon, authenticated;
revoke execute on function public.publish_totw(timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.totw_due() to service_role;
grant execute on function public.publish_totw(timestamptz, text, jsonb) to service_role;
revoke execute on function public.events_tick() from public, anon, authenticated;

-- Relevés des classements de buteurs (football-data.org) : buts / passes de la semaine = différence avec le relevé
-- précédent. Écrits et lus uniquement avec la clé de service (aucune politique RLS).
create table public.totw_scorer_snapshots (
  competition text not null,
  fd_player int not null,
  goals int not null,
  assists int not null,
  taken_at timestamptz not null default now(),
  primary key (competition, fd_player, taken_at)
);
alter table public.totw_scorer_snapshots enable row level security;
grant select, insert on public.totw_scorer_snapshots to service_role;
