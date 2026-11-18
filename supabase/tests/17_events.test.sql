-- Événements du vendredi et équipe de la semaine.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Le seed n'a pas de dates de naissance : quelques joueurs de 19 ans pour le thème « Futures stars »
update public.players set birthdate = current_date - interval '19 years'
where id in (select player_id from public.card_templates where edition = 'Base' and is_active order by rating desc limit 15);
create temporary table ev as select public.launch_weekly_event('futures-stars', '2026-11-20 18:00:00+00') as id;

select ok((select id from ev) is not null, 'Événement lancé');
select ok((select count(*) from public.card_templates where event_id = (select id from ev)) between 1 and 12,
  'Cartes d''événement créées (12 au plus)');
select ok((select bool_and(ct.rating = least(99, base.rating + 6))
           from public.card_templates ct
           join public.card_templates base on base.player_id = ct.player_id and base.edition = 'Base' and base.is_active
           where ct.event_id = (select id from ev)), 'Note boostée du bonus du thème (+6)');
select ok((select bool_and(ct.max_supply = 40 and ct.rarity in ('epique', 'legendaire'))
           from public.card_templates ct where ct.event_id = (select id from ev)), 'Tirage limité, Épique ou Légendaire');
select is((select b.kind::text from public.boosters b join public.game_events e on e.booster_id = b.id where e.id = (select id from ev)),
  'event', 'Booster d''événement créé');
select ok((select count(*) from public.booster_cards bc join public.game_events e on e.booster_id = bc.booster_id
           where e.id = (select id from ev)) > 0, 'Réserve du booster = cartes de l''événement');
select is((select count(*)::int from public.booster_grants g join public.game_events e on e.booster_id = g.booster_id
           where e.id = (select id from ev)),
  (select count(*)::int from public.profiles where banned_at is null), 'Un pack offert à chaque joueur');
select is(public.launch_weekly_event('murailles', '2026-11-20 18:00:00+00'), null, 'Un seul événement par créneau');
create temporary table ev2 as select public.launch_weekly_event(null, '2026-11-27 18:00:00+00') as id;
select is((select theme from public.game_events where id = (select id from ev2)),
  'heros-championnat', 'Rotation : thème suivant le moins récent');

-- Équipe de la semaine : publication réservée au créneau dû
select throws_ok($$select public.publish_totw('2020-01-01 18:00:00+00', 'x', '[]')$$, 'P0001', null,
  'Publication hors créneau refusée');

set local role authenticated;
select throws_ok($$select public.launch_weekly_event('noel', now())$$, '42501', null, 'Lancement interdit aux joueurs');
select throws_ok($$select public.publish_totw(now(), 'x', '[]')$$, '42501', null, 'Publication interdite aux joueurs');
reset role;

select * from finish();
rollback;
