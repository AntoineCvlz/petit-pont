-- Administration des comptes : packs et cartes offerts, pièces, retrait de cartes, réinitialisation, bannissement.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

insert into auth.users (id, email, raw_user_meta_data) values
  ('acacacac-0000-4000-8000-00000000000a', 'cible@example.test', '{"username":"Cible"}'),
  ('acacacac-0000-4000-8000-00000000000b', 'tiers@example.test', '{"username":"Tiers"}');

create temporary table ids as select
  (select id from public.profiles where username = 'Arbitre') as admin,
  'acacacac-0000-4000-8000-00000000000a'::uuid as cible,
  'acacacac-0000-4000-8000-00000000000b'::uuid as tiers,
  (select id from public.boosters where slug = 'standard') as booster,
  (select id from public.card_templates where max_supply is null order by id limit 1) as tpl,
  (select id from public.card_templates where max_supply is null order by id offset 1 limit 1) as tpl2;
grant select on ids to authenticated;

-- --- Un joueur n'a accès à rien -------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"acacacac-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.admin_give_boosters((select tiers from ids), (select booster from ids), 1)$$, '42501', null, 'Packs : réservé aux admins');
select throws_ok($$select public.admin_give_cards((select cible from ids), (select tpl from ids), 1)$$, '42501', null, 'Cartes : réservé aux admins');
select throws_ok($$select public.admin_adjust_coins((select cible from ids), 1000)$$, '42501', null, 'Pièces : réservé aux admins');
select throws_ok($$select public.admin_reset_account((select tiers from ids))$$, '42501', null, 'Réinitialisation : réservée aux admins');
select throws_ok($$select public.admin_set_ban((select tiers from ids), true)$$, '42501', null, 'Bannissement : réservé aux admins');
select is((select count(*)::int from public.admin_actions), 0, 'Journal admin invisible pour un joueur');

-- --- Admin ------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000ad","role":"authenticated"}';

-- Packs offerts
select is(public.admin_give_boosters((select cible from ids), (select booster from ids), 2, 'Merci pour le bug'), 2, 'Deux packs offerts');
select throws_ok($$select public.admin_give_boosters((select cible from ids), (select booster from ids), 0)$$, 'P0001', null, 'Quantité de packs bornée');

-- Cartes offertes
select is(public.admin_give_cards((select cible from ids), (select tpl from ids), 3), 3, 'Trois exemplaires offerts');
select is((select count(*)::int from public.card_instances where owner_id = (select cible from ids) and obtained_via = 'admin'), 3,
  'Exemplaires créés avec l''origine « admin »');

-- Pièces
select is(public.admin_adjust_coins((select cible from ids), 500, 'Concours'), 1500::bigint, 'Pièces ajoutées');
select throws_ok($$select public.admin_adjust_coins((select cible from ids), -999999)$$, 'P0001', null, 'Impossible de passer sous zéro');
select is(public.admin_adjust_coins((select cible from ids), -200), 1300::bigint, 'Pièces retirées');

reset role;
select is((select count(*)::int from public.notifications where user_id = (select cible from ids) and type = 'gift'), 3,
  'Le joueur est notifié de chaque cadeau');
set local role authenticated;
select is((select count(*)::int from public.admin_actions where target_id = (select cible from ids)), 4, 'Actions journalisées');

-- Le joueur ouvre un pack offert
set local request.jwt.claims to '{"sub":"acacacac-0000-4000-8000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.booster_grants where opened_at is null), 2, 'Le joueur voit ses packs offerts');
create temporary table g as select id from public.booster_grants order by created_at, id limit 1;
grant select on g to authenticated;
select is(jsonb_array_length(public.open_granted_booster((select id from g)) -> 'cards'), 5, 'Pack offert ouvert : 5 cartes');
select is((select coins from public.profiles where id = (select cible from ids)), 1300::bigint, 'Pack offert : aucune pièce débitée');
select throws_ok($$select public.open_granted_booster((select id from g))$$, 'P0001', 'Ce pack a déjà été ouvert', 'Un pack offert ne s''ouvre qu''une fois');

set local request.jwt.claims to '{"sub":"acacacac-0000-4000-8000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.open_granted_booster((select id from public.booster_grants where opened_at is null limit 1))$$,
  'P0001', null, 'Le pack d''un autre joueur est introuvable');

-- Une carte de la cible en vente et dans un échange en attente
set local request.jwt.claims to '{"sub":"acacacac-0000-4000-8000-00000000000a","role":"authenticated"}';
create temporary table c as
  select (select id from public.card_instances where owner_id = 'acacacac-0000-4000-8000-00000000000a' and obtained_via = 'admin' order by serial_number limit 1) as sold,
         (select id from public.card_instances where owner_id = 'acacacac-0000-4000-8000-00000000000a' and obtained_via = 'admin' order by serial_number offset 1 limit 1) as traded;
grant select on c to authenticated;
select lives_ok($$select public.create_listing((select sold from c), 300)$$, 'Annonce créée');
select lives_ok($$select public.propose_trade((select tiers from ids), array[(select traded from c)], '{}'::uuid[], 0, 0, null)$$, 'Échange proposé');

-- Retrait de cartes : annonce et échange annulés, joueur notifié
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000ad","role":"authenticated"}';
select is(public.admin_remove_cards(array[(select sold from c), (select traded from c)], 'Doublon frauduleux'), 2, 'Deux cartes retirées');
select is((select count(*)::int from public.market_listings where status = 'active' and seller_id = (select cible from ids)), 0, 'Annonce annulée');
select is((select status::text from public.trades where proposer_id = (select cible from ids)), 'cancelled', 'Échange en attente annulé');
reset role;
select ok(exists (select 1 from public.notifications where user_id = (select tiers from ids) and type = 'trade_cancelled'),
  'L''autre partie de l''échange est prévenue');
set local role authenticated;

-- Lecture admin
select ok((select count(*) from public.booster_openings where user_id = (select cible from ids)) = 1, 'L''admin voit les ouvertures des joueurs');
select ok((select count(*) from public.trades where proposer_id = (select cible from ids)) = 1, 'L''admin voit les échanges des joueurs');

-- Réinitialisation
select is((public.admin_reset_account((select cible from ids), 'Triche') ->> 'coins_after')::bigint, 1000::bigint, 'Compte réinitialisé');
select is((select count(*)::int from public.card_instances where owner_id = (select cible from ids)), 0, 'Plus aucune carte');
select is((select coins from public.profiles where id = (select cible from ids)), 1000::bigint, 'Solde ramené au solde de départ');
select is((select count(*)::int from public.booster_grants where user_id = (select cible from ids) and opened_at is null), 0, 'Packs non ouverts retirés');
select throws_ok($$select public.admin_reset_account((select admin from ids))$$, 'P0001', null, 'Impossible de réinitialiser un administrateur');

-- Bannissement
select lives_ok($$select public.admin_set_ban((select cible from ids), true, 'Insultes')$$, 'Joueur banni');
reset role;
select ok((select banned_until > now() + interval '50 years' from auth.users where id = (select cible from ids)), 'Connexion bloquée côté authentification');
set local role authenticated;
set local request.jwt.claims to '{"sub":"acacacac-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.claim_daily_bonus()$$, 'P0001', 'Ton compte est suspendu', 'Un joueur banni ne peut plus agir (jeton encore valide)');

reset role;
select * from finish();
rollback;
