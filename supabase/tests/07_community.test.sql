-- Tests phase 7 : classements, vitrine, suggestions, notifications.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-4000-8000-00000000000a', 'cm.a@example.test', '{"username":"CommuA"}'),
  ('ffffffff-0000-4000-8000-00000000000b', 'cm.b@example.test', '{"username":"CommuB"}');

-- B possède 2 exemplaires d'une Spéciale et 1 d'une Commune ; A souhaite la Spéciale et la Commune
create temporary table c as select
  (select id from public.card_templates where rarity = 'speciale' order by id limit 1) as spe,
  (select id from public.card_templates where rarity = 'commune' order by id limit 1) as com;
select public._mint_card((select spe from c), 'ffffffff-0000-4000-8000-00000000000b', 'test') from generate_series(1, 2);
select public._mint_card((select com from c), 'ffffffff-0000-4000-8000-00000000000b', 'test');
insert into public.wishlists (user_id, template_id) values
  ('ffffffff-0000-4000-8000-00000000000a', (select spe from c)),
  ('ffffffff-0000-4000-8000-00000000000a', (select com from c));
create temporary table mine as
  select public._mint_card((select com from c), 'ffffffff-0000-4000-8000-00000000000a', 'test') as id;
grant select on c, mine to authenticated;

-- --- Classements ----------------------------------------------------------------
select ok(public.refresh_leaderboards() >= 0, 'Rafraîchissement des classements');
select is((select rarity_score from public.leaderboard_stats where user_id = 'ffffffff-0000-4000-8000-00000000000b' and period = 'all'),
  241::bigint, 'Score de rareté pondéré : 2 × 120 + 1');
select is((select cards from public.leaderboard_stats where user_id = 'ffffffff-0000-4000-8000-00000000000b' and period = 'week'),
  3, 'Cartes obtenues dans la semaine');
select ok(exists (select 1 from public.activity_feed f where f.user_id = 'ffffffff-0000-4000-8000-00000000000b'
                  and f.type = 'leaderboard_top10' and f.payload ->> 'metric' = 'rarity_score'),
  'Entrée dans le top 10 publiée dans le fil');
select is(public.refresh_leaderboards(), 0, 'Pas de doublon d''événement au rafraîchissement suivant');

set local role authenticated;
set local request.jwt.claims to '{"sub":"ffffffff-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok($$select * from public.get_leaderboard('coins; drop table x', 'all')$$, 'P0001', 'Classement inconnu', 'Métrique non autorisée refusée');
select throws_ok($$select * from public.get_leaderboard('cards', 'year')$$, 'P0001', 'Classement inconnu', 'Période non autorisée refusée');
select ok((select bool_or(is_me) from public.get_leaderboard('rarity_score', 'all', 1)), 'Ma position est toujours renvoyée');
select is((select count(*)::int from public.get_leaderboard('rarity_score', 'all', 1) where not is_me), 1, 'Limite respectée pour les autres');
select ok((select count(*) from public.leaderboard_stats) > 0, 'Statistiques lisibles par un joueur connecté');

-- --- Suggestions ------------------------------------------------------------------
select results_eq($$select username, matches from public.wishlist_matches(5) where username = 'CommuB'$$,
  $$values ('CommuB'::text, 1)$$, 'B suggéré : doublon de la Spéciale souhaitée (la Commune en un seul exemplaire ne compte pas)');

-- --- Vitrine ------------------------------------------------------------------------
select lives_ok($$select public.set_showcase(array[(select id from mine)])$$, 'Vitrine enregistrée');
select throws_ok($$select public.set_showcase(array(select id from public.card_instances where owner_id = 'ffffffff-0000-4000-8000-00000000000b' limit 1))$$,
  'P0001', 'Une carte de la vitrine ne t''appartient pas ou est en vente', 'Carte d''un autre refusée');
select throws_ok($$select public.set_showcase(array[(select id from mine), (select id from mine)])$$, 'P0001', null, 'Doublon refusé');
select throws_ok($$insert into public.profile_showcase (user_id, slot, instance_id) values ('ffffffff-0000-4000-8000-00000000000a', 2, (select id from mine))$$,
  '42501', null, 'Écriture directe de la vitrine refusée');
select public.create_listing((select id from mine), 50);
reset role;
select is((select count(*)::int from public.profile_showcase where user_id = 'ffffffff-0000-4000-8000-00000000000a'), 0,
  'Mise en vente : la carte quitte la vitrine');

-- --- Notifications ------------------------------------------------------------------
insert into public.notifications (user_id, type, title) values
  ('ffffffff-0000-4000-8000-00000000000a', 'test', 'Un'), ('ffffffff-0000-4000-8000-00000000000a', 'test', 'Deux'),
  ('ffffffff-0000-4000-8000-00000000000b', 'test', 'Autre');
set local role authenticated;
select is((select count(*)::int from public.notifications where type = 'test'), 2, 'Je ne vois que mes notifications');
select is(public.mark_all_notifications_read(), (select count(*)::int from public.notifications where not is_read), 'Tout marquer comme lu');
reset role;
select is((select count(*)::int from public.notifications where user_id = 'ffffffff-0000-4000-8000-00000000000b' and not is_read), 1,
  'Les notifications des autres ne sont pas touchées');
set local role anon;
select throws_ok($$select count(*) from public.leaderboard_stats$$, '42501', null, 'Classements non lisibles anonymement');
reset role;

select * from finish();
rollback;
