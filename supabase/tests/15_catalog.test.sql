-- Catalogue importé : champs de la fiche joueur, tirage du draft indépendant du nombre de Communes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select throws_ok($$insert into public.players (slug, last_name, display_name, nation_id, position, weak_foot)
  values ('test-mp', 'Test', 'Test', (select min(id) from public.nations), 'ATT', 6)$$, '23514', null, 'Mauvais pied : 1 à 5 étoiles');
select throws_ok($$insert into public.players (slug, last_name, display_name, nation_id, position, position_detail)
  values ('test-poste', 'Test', 'Test', (select min(id) from public.nations), 'ATT', 'buteur')$$, '23514', null, 'Poste précis : code court');
select lives_ok($$insert into public.players (slug, last_name, display_name, nation_id, position, weak_foot, skill_moves,
  position_detail, alt_positions, preferred_foot, birthdate, stats)
  values ('test-ok', 'Test', 'Test', (select min(id) from public.nations), 'ATT', 4, 5, 'ST', '{LW}', 'Droit', '1998-12-20',
  '{"pac":96}')$$, 'Fiche complète acceptée');

-- 200 propositions de draft : jamais de Commune
select is((select count(*) from (select unnest(public._draft_offer(gen_random_uuid(), 'ATT')) as id from generate_series(1, 40)) o
  join public.card_templates ct on ct.id = o.id where ct.rarity = 'commune'), 0::bigint, 'Draft : pas de Commune proposée');

select * from finish();
rollback;
