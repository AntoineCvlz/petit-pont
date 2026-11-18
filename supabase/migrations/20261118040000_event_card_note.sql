-- Raison de la sélection d'une carte d'événement (équipe de la semaine : « 2 buts, 1 passe déc. », « 2 clean sheets »…),
-- affichée sur la page Événements.
alter table public.card_templates add column event_note text check (event_note is null or length(event_note) <= 80);

create or replace function public.publish_totw(p_slot timestamptz, p_period text, p_picks jsonb)
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
                                     event_id, stats, event_note)
  select ct.player_id, ct.club_id, 'Semaine du ' || p_period, 'Équipe de la semaine',
         case when least(99, ct.rating + x.boost) >= 88 then 'legendaire' else 'epique' end::public.rarity,
         least(99, ct.rating + x.boost),
         (select coalesce(max(collection_number), 0) from public.card_templates) + row_number() over (order by ct.rating desc, ct.id),
         40, v_event, public._boost_stats(p.stats, x.boost, '{}'), left(x.reason, 80)
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
revoke execute on function public.publish_totw(timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_totw(timestamptz, text, jsonb) to service_role;
