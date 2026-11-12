-- Tests de fondation : inscription, journal des pièces, numéros de série, RLS.
-- Lancer avec : npm run test:db  (supabase test db)
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- -----------------------------------------------------------------------------
-- RLS activée sur toutes les tables du schéma public
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS activée sur toutes les tables'
);

-- -----------------------------------------------------------------------------
-- Inscription : profil + solde de départ journalisé
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values ('11111111-1111-4111-8111-111111111111', 'test.a@example.test', '{"username":"TesteurA","is_demo":true}', '{}');
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values ('22222222-2222-4222-8222-222222222222', 'test.b@example.test', '{"username":"TesteurB"}', '{}');

select is((select coins from public.profiles where username = 'TesteurA'), 1000::bigint, 'Solde de départ crédité');
select is(
  (select count(*)::int from public.coin_transactions t join public.profiles p on p.id = t.user_id
   where p.username = 'TesteurA' and t.type = 'starting_balance'),
  1, 'Solde de départ journalisé'
);
select is((select is_demo from public.profiles where username = 'TesteurA'), false,
  'is_demo ignoré s''il vient des métadonnées utilisateur');

select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'x@example.test', '{"username":"testeura"}')$$,
  'P0001', 'Ce pseudo est déjà pris.', 'Pseudo unique (insensible à la casse)'
);
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'y@example.test', '{"username":"Le_Connard"}')$$,
  'P0001', 'Ce pseudo n''est pas autorisé.', 'Mots interdits filtrés'
);
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'z@example.test', '{"username":"a b"}')$$,
  'P0001', null, 'Format de pseudo vérifié'
);

-- -----------------------------------------------------------------------------
-- _apply_coins : solde jamais négatif, journal cohérent
-- -----------------------------------------------------------------------------
select lives_ok(
  $$select public._apply_coins('11111111-1111-4111-8111-111111111111', -300, 'booster_purchase', 'test')$$,
  'Débit autorisé si solde suffisant'
);
select throws_ok(
  $$select public._apply_coins('11111111-1111-4111-8111-111111111111', -5000, 'booster_purchase', 'test')$$,
  'P0001', 'Solde insuffisant', 'Débit refusé si solde insuffisant'
);
select is((select coins from public.profiles where username = 'TesteurA'), 700::bigint, 'Solde après débit');
select ok((select bool_and(is_consistent) from public.coin_balance_audit), 'Solde = somme du journal pour tous les joueurs');
select throws_ok(
  $$update public.coin_transactions set amount = 1 where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'P0001', 'Le journal des pièces est immuable', 'Journal immuable (update)'
);
select throws_ok(
  $$delete from public.coin_transactions where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'P0001', 'Le journal des pièces est immuable', 'Journal immuable (delete)'
);

-- -----------------------------------------------------------------------------
-- _mint_card : numéros de série consécutifs, tirage limité respecté
-- -----------------------------------------------------------------------------
create temporary table tpl as
  select id from public.card_templates where max_supply is not null order by id limit 1;
update public.card_templates set max_supply = minted_count + 2 where id = (select id from tpl);

select lives_ok($$select public._mint_card((select id from tpl), '11111111-1111-4111-8111-111111111111')$$, 'Création d''un exemplaire');
select lives_ok($$select public._mint_card((select id from tpl), '22222222-2222-4222-8222-222222222222')$$, 'Création d''un second exemplaire');
select throws_ok(
  $$select public._mint_card((select id from tpl), '22222222-2222-4222-8222-222222222222')$$,
  'P0001', 'Tirage épuisé pour cette carte', 'Tirage limité respecté'
);
select is(
  (select max(serial_number) from public.card_instances where template_id = (select id from tpl)),
  (select minted_count from public.card_templates where id = (select id from tpl)),
  'Numéros de série alignés sur le compteur'
);

-- -----------------------------------------------------------------------------
-- Droits des clients (rôle authenticated = TesteurB)
-- -----------------------------------------------------------------------------
grant select on tpl to authenticated;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';

select throws_ok(
  $$update public.profiles set coins = 999999 where id = '22222222-2222-4222-8222-222222222222'$$,
  '42501', null, 'Un joueur ne peut pas modifier son solde'
);
select throws_ok(
  $$insert into public.card_instances (template_id, owner_id, serial_number) values ((select id from tpl), '22222222-2222-4222-8222-222222222222', 9999)$$,
  '42501', null, 'Un joueur ne peut pas créer de carte'
);
select throws_ok(
  $$select public._mint_card(1, '22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'Fonction interne _mint_card inaccessible'
);
select throws_ok(
  $$select public._apply_coins('22222222-2222-4222-8222-222222222222', 1000, 'admin_adjustment')$$,
  '42501', null, 'Fonction interne _apply_coins inaccessible'
);
select is(
  (select count(*)::int from public.coin_transactions where user_id = '11111111-1111-4111-8111-111111111111'),
  0, 'Le journal des autres joueurs est invisible'
);

-- Mise à jour autorisée d'un paramètre de son propre profil, sans effet sur les autres
update public.profiles set reduced_motion = true where id = '11111111-1111-4111-8111-111111111111';
update public.profiles set reduced_motion = true where id = '22222222-2222-4222-8222-222222222222';
reset role;
select is((select reduced_motion from public.profiles where username = 'TesteurA'), false, 'Profil d''un autre joueur non modifiable');
select is((select reduced_motion from public.profiles where username = 'TesteurB'), true, 'Paramètre de son propre profil modifiable');

select * from finish();
rollback;
