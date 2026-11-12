-- Tests phase 2 : ouverture de boosters et revente des doublons.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'boost.a@example.test', '{"username":"BoostA"}'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'boost.b@example.test', '{"username":"BoostB"}');
select public._apply_coins('aaaaaaaa-0000-4000-8000-000000000001', 50000, 'admin_adjustment', 'test');

create temporary table ids as
select (select id from public.boosters where slug = 'standard') as standard,
       (select id from public.boosters where slug = 'premium') as premium,
       (select id from public.boosters where slug = 'gratuit') as gratuit,
       (select id from public.boosters where slug = 'coupe-des-etoiles') as limited,
       (select id from public.boosters where slug = 'nuit-des-etoiles') as event;
grant select on ids to authenticated;
create temporary table results (n int, res jsonb);
grant select, insert on results to authenticated;

-- Joueur A connecté
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';

-- --- Booster payant ----------------------------------------------------------
insert into results select 1, public.open_booster((select standard from ids));
select is(jsonb_array_length((select res from results where n = 1) -> 'cards'), 5, 'Standard : 5 cartes');
select is(((select res from results where n = 1) ->> 'balance')::bigint, 51000::bigint - 200, 'Standard : 200 pièces débitées');
select is((select count(*)::int from public.card_instances where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 5,
  'Exemplaires créés pour le joueur');
select is((select count(*)::int from public.booster_openings where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 1,
  'Ouverture journalisée');
select is(
  (select count(*)::int from public.coin_transactions where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and type = 'booster_purchase'),
  1, 'Achat journalisé dans les pièces');
select ok(
  (select bool_and(public.rarity_rank((c ->> 'rarity')::public.rarity) >= 1) from results, jsonb_array_elements(res -> 'cards') c where n = 1),
  'Raretés valides');

-- --- Garantie : 30 boosters Premium, chacun avec au moins une Épique ----------
insert into results select 100 + g, public.open_booster((select premium from ids)) from generate_series(1, 30) g;
select ok(
  (select bool_and(x.ok) from (
     select n, bool_or(public.rarity_rank((c ->> 'rarity')::public.rarity) >= 3) as ok
     from results, jsonb_array_elements(res -> 'cards') c where n > 100 group by n) x),
  'Premium : au moins une Épique dans chaque booster (30 ouvertures)');
select ok(
  (select bool_and(jsonb_array_length(res -> 'cards') = 6) from results where n > 100),
  'Premium : 6 cartes à chaque fois');

-- --- Badges NOUVEAU / DOUBLON -------------------------------------------------
select ok(
  (select count(*) = 0 from (
    select c ->> 'template_id' as t, count(*) filter (where (c ->> 'is_new')::boolean) as news
    from results, jsonb_array_elements(res -> 'cards') c where n > 100
    group by 1 having count(*) filter (where (c ->> 'is_new')::boolean) > 1) x),
  'Une carte n''est « nouvelle » qu''une seule fois');

-- --- Booster gratuit et délai -------------------------------------------------
select lives_ok($$select public.open_booster((select gratuit from ids))$$, 'Booster gratuit ouvert');
select throws_ok($$select public.open_booster((select gratuit from ids))$$, 'P0001',
  'Ton booster gratuit n''est pas encore prêt', 'Délai du booster gratuit respecté');
select is((public.booster_availability((select gratuit from ids)) ->> 'reason'), 'cooldown', 'Disponibilité : en recharge');

-- --- Joueur B : solde insuffisant --------------------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}';
select public.open_booster((select premium from ids)); -- 1000 → 350
select throws_ok($$select public.open_booster((select premium from ids))$$, 'P0001', 'Solde insuffisant',
  'Second Premium refusé faute de pièces');
reset role;
select is((select coins from public.profiles where username = 'BoostB'), 350::bigint, 'Solde inchangé après refus');
select is((select count(*)::int from public.card_instances where owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'), 6,
  'Aucune carte créée par l''ouverture refusée');

-- --- Stock limité et dates ----------------------------------------------------
update public.boosters set stock_remaining = 1 where id = (select limited from ids);
update public.boosters set ends_at = now() - interval '1 minute', starts_at = now() - interval '2 days'
where id = (select event from ids);
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$select public.open_booster((select limited from ids))$$, 'Dernier booster limité acheté');
select throws_ok($$select public.open_booster((select limited from ids))$$, 'P0001',
  'Rupture de stock : ce booster est épuisé', 'Stock épuisé refusé');
select throws_ok($$select public.open_booster((select event from ids))$$, 'P0001',
  'Ce booster n''est pas disponible en ce moment', 'Événement terminé refusé');
reset role;
select is((select stock_remaining from public.boosters where id = (select limited from ids)), 0, 'Stock à zéro');

-- --- Revente des doublons -----------------------------------------------------
create temporary table dup as
  select ci.id, ci.template_id from public.card_instances ci
  where ci.owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
    and ci.template_id in (select template_id from public.card_instances
                           where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
                           group by template_id having count(*) >= 2)
  order by ci.serial_number desc;
create temporary table single as
  select min(ci.id::text)::uuid as id from public.card_instances ci
  where ci.owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  group by ci.template_id having count(*) = 1 limit 1;
create temporary table other as
  select public._mint_card((select id from public.card_templates where rarity = 'commune' limit 1),
                           'aaaaaaaa-0000-4000-8000-000000000002') as id;
grant select on dup, single, other to authenticated;
create temporary table before as select coins from public.profiles where username = 'BoostA';
grant select on before to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$select public.sell_duplicates(array[(select id from single)])$$, 'P0001',
  'Tu dois garder au moins un exemplaire de chaque carte', 'Dernier exemplaire non revendable');
select throws_ok($$select public.sell_duplicates(array[(select id from other)])$$, 'P0001',
  'Cet exemplaire ne t''appartient pas', 'Exemplaire d''un autre joueur refusé');
select throws_ok(
  $$select public.sell_duplicates(array(select id from dup where template_id = (select template_id from dup limit 1)))$$,
  'P0001', 'Tu dois garder au moins un exemplaire de chaque carte', 'Revendre tous les exemplaires d''une carte refusé');
select lives_ok($$select public.sell_duplicates(array[(select id from dup limit 1)])$$, 'Revente d''un doublon');
reset role;
select ok((select coins from public.profiles where username = 'BoostA') > (select coins from before), 'Pièces créditées');
select ok(not exists (select 1 from public.card_instances where id = (select id from dup limit 1)), 'Exemplaire revendu supprimé');
select ok((select bool_and(is_consistent) from public.coin_balance_audit), 'Solde = journal après toutes les opérations');

select * from finish();
rollback;
