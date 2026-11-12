-- Tests phase 4 : bonus quotidien, revente groupée.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-0000-4000-8000-000000000001', 'eco.a@example.test', '{"username":"EcoA"}');

-- Collection de test : 3 exemplaires d'une commune, 2 d'une légendaire, 1 d'une rare
create temporary table t as select
  (select id from public.card_templates where rarity = 'commune' order by id limit 1) as commune,
  (select id from public.card_templates where rarity = 'legendaire' order by id limit 1) as legendaire,
  (select id from public.card_templates where rarity = 'rare' order by id limit 1) as rare;
select public._mint_card((select commune from t), 'cccccccc-0000-4000-8000-000000000001', 'test') from generate_series(1, 3);
select public._mint_card((select legendaire from t), 'cccccccc-0000-4000-8000-000000000001', 'test') from generate_series(1, 2);
select public._mint_card((select rare from t), 'cccccccc-0000-4000-8000-000000000001', 'test');
-- Un exemplaire de la rare verrouillé + un second libre
select public._mint_card((select rare from t), 'cccccccc-0000-4000-8000-000000000001', 'test');
update public.card_instances set is_locked = true
where id = (select id from public.card_instances where owner_id = 'cccccccc-0000-4000-8000-000000000001'
            and template_id = (select rare from t) order by serial_number limit 1);
create temporary table first_serial as select min(serial_number) as s from public.card_instances
  where owner_id = 'cccccccc-0000-4000-8000-000000000001' and template_id = (select commune from t);
grant select on t to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub":"cccccccc-0000-4000-8000-000000000001","role":"authenticated"}';

-- --- Bonus quotidien ----------------------------------------------------------
select is((public.daily_bonus_status() ->> 'available')::boolean, true, 'Bonus disponible');
select is((public.claim_daily_bonus() ->> 'amount')::int, 100, 'Bonus de 100 pièces');
select throws_ok($$select public.claim_daily_bonus()$$, 'P0001', 'Bonus du jour déjà récupéré, reviens demain !',
  'Un seul bonus par jour');
select is((public.daily_bonus_status() ->> 'available')::boolean, false, 'Bonus indisponible ensuite');
select ok((public.daily_bonus_status() ->> 'next_at')::timestamptz > now(), 'Prochain bonus dans le futur');
reset role;
update public.profiles set last_daily_bonus_at = now() - interval '1 day' where username = 'EcoA';
set local role authenticated;
select lives_ok($$select public.claim_daily_bonus()$$, 'Nouveau bonus le lendemain');
reset role;
select is((select coins from public.profiles where username = 'EcoA'), 1200::bigint, 'Solde : 1000 + 2 × 100');

-- --- Revente groupée ----------------------------------------------------------
set local role authenticated;
select is((public.sell_all_duplicates('commune') ->> 'sold')::int, 2, 'Jusqu''à Commune : 2 doublons vendus');
reset role;
select is((select count(*)::int from public.card_instances where owner_id = 'cccccccc-0000-4000-8000-000000000001'
           and template_id = (select commune from t)), 1, 'Un exemplaire de la commune conservé');
select is((select min(serial_number) from public.card_instances where template_id = (select commune from t)
           and owner_id = 'cccccccc-0000-4000-8000-000000000001'),
          (select s from first_serial), 'Le plus petit numéro de série est conservé');
select is((select count(*)::int from public.card_instances where owner_id = 'cccccccc-0000-4000-8000-000000000001'
           and template_id = (select legendaire from t)), 2, 'Légendaires intactes (au-dessus du plafond)');

set local role authenticated;
select is((public.sell_all_duplicates('epique') ->> 'sold')::int, 0,
  'La rare verrouillée + une libre : la libre est conservée, rien à vendre');
select is((public.sell_all_duplicates('commune') ->> 'sold')::int, 0, 'Plus aucun doublon : rien vendu, pas d''erreur');
reset role;

select ok((select bool_and(is_consistent) from public.coin_balance_audit), 'Solde = journal');

select * from finish();
rollback;
