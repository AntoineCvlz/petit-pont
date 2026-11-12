-- Tests phase 5 : marché entre joueurs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-4000-8000-00000000000a', 'mkt.seller@example.test', '{"username":"Vendeur"}'),
  ('dddddddd-0000-4000-8000-00000000000b', 'mkt.buyer@example.test', '{"username":"Acheteur"}'),
  ('dddddddd-0000-4000-8000-00000000000c', 'mkt.poor@example.test', '{"username":"Fauche"}');

create temporary table c as select
  public._mint_card((select id from public.card_templates where rarity = 'legendaire' order by id limit 1),
                    'dddddddd-0000-4000-8000-00000000000a', 'test') as card1,
  public._mint_card((select id from public.card_templates where rarity = 'commune' order by id limit 1),
                    'dddddddd-0000-4000-8000-00000000000a', 'test') as card2;
create temporary table l (id uuid, name text);
grant select on c to authenticated;
grant select, insert on l to authenticated;

-- --- Mise en vente ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-0000-4000-8000-00000000000a","role":"authenticated"}';
insert into l select public.create_listing((select card1 from c), 2500), 'big';
select ok((select id from l where name = 'big') is not null, 'Annonce créée');
select throws_ok($$select public.create_listing((select card1 from c), 100)$$, 'P0001',
  'Cet exemplaire est déjà en vente ou dans un échange', 'Pas deux annonces pour un même exemplaire');
select throws_ok($$select public.create_listing((select card2 from c), 0)$$, 'P0001', null, 'Prix nul refusé');
select throws_ok($$select public.sell_duplicates(array[(select card1 from c)])$$, 'P0001', null,
  'Exemplaire en vente non revendable au système');
reset role;
select is((select is_locked from public.card_instances where id = (select card1 from c)), true, 'Exemplaire verrouillé');

-- Un autre joueur ne peut pas vendre la carte du vendeur ni annuler son annonce
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-0000-4000-8000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.create_listing((select card2 from c), 100)$$, 'P0001',
  'Cet exemplaire ne t''appartient pas', 'Vendre la carte d''un autre : refusé');
select throws_ok($$select public.cancel_listing((select id from l where name = 'big'))$$, 'P0001',
  'Annonce introuvable', 'Annuler l''annonce d''un autre : refusé');
select throws_ok($$update public.market_listings set price = 1 where id = (select id from l where name = 'big')$$,
  '42501', null, 'Modification directe d''une annonce : refusée');

-- --- Achat --------------------------------------------------------------------
select throws_ok($$select public.buy_listing((select id from l where name = 'big'))$$, 'P0001', 'Solde insuffisant',
  'Achat refusé faute de pièces (1000 < 2500)');
reset role;
select public._apply_coins('dddddddd-0000-4000-8000-00000000000b', 5000, 'admin_adjustment', 'test');
set local role authenticated;
select is((public.buy_listing((select id from l where name = 'big')) ->> 'fee')::int, 125, 'Commission de 5 % (125)');
select throws_ok($$select public.buy_listing((select id from l where name = 'big'))$$, 'P0001',
  'Trop tard : cette carte vient d''être vendue ou retirée', 'Une annonce ne se vend qu''une fois');
reset role;

select is((select coins from public.profiles where username = 'Acheteur'), 6000::bigint - 2500, 'Acheteur débité du prix');
select is((select coins from public.profiles where username = 'Vendeur'), 1000::bigint + 2500 - 125, 'Vendeur crédité moins la commission');
select is((select owner_id from public.card_instances where id = (select card1 from c)),
  'dddddddd-0000-4000-8000-00000000000b'::uuid, 'Exemplaire transféré à l''acheteur');
select is((select is_locked from public.card_instances where id = (select card1 from c)), false, 'Exemplaire déverrouillé');
select is((select obtained_via from public.card_instances where id = (select card1 from c)), 'market', 'Provenance : marché');
select is((select status::text from public.market_listings where id = (select id from l where name = 'big')), 'sold', 'Annonce vendue');
select is((select count(*)::int from public.market_sales where listing_id = (select id from l where name = 'big')), 1, 'Vente enregistrée');
select is((select count(*)::int from public.card_instance_history where instance_id = (select card1 from c) and event = 'market_sale'),
  1, 'Historique de l''exemplaire');
select is((select count(*)::int from public.notifications n join public.profiles p on p.id = n.user_id
           where p.username = 'Vendeur' and n.type = 'market_sale'), 1, 'Vendeur notifié');
select is((select count(*)::int from public.activity_feed f join public.profiles p on p.id = f.user_id
           where p.username = 'Vendeur' and f.type = 'big_sale'), 1, 'Vente importante publiée (≥ 2000)');
select ok((select bool_and(is_consistent) from public.coin_balance_audit), 'Solde = journal pour tous');

-- --- Annulation ---------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-0000-4000-8000-00000000000a","role":"authenticated"}';
insert into l select public.create_listing((select card2 from c), 40), 'small';
select throws_ok($$select public.buy_listing((select id from l where name = 'small'))$$, 'P0001',
  'Tu ne peux pas acheter ta propre annonce', 'Acheter sa propre annonce : refusé');
select lives_ok($$select public.cancel_listing((select id from l where name = 'small'))$$, 'Annonce retirée');
select throws_ok($$select public.cancel_listing((select id from l where name = 'small'))$$, 'P0001', null, 'Double retrait refusé');
reset role;
select is((select is_locked from public.card_instances where id = (select card2 from c)), false, 'Exemplaire déverrouillé après retrait');
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-0000-4000-8000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.buy_listing((select id from l where name = 'small'))$$, 'P0001',
  'Trop tard : cette carte vient d''être vendue ou retirée', 'Annonce retirée non achetable');

-- --- Recherches -----------------------------------------------------------------
select lives_ok($$select public.record_market_search('mbappe')$$, 'Recherche sans accent enregistrée');
select ok((select count(*) from public.market_searches s join public.card_templates ct on ct.id = s.template_id
           join public.players p on p.id = ct.player_id where p.slug = 'mbappe') >= 4,
  'Rattachée aux 4 cartes de Mbappé');
reset role;
create temporary table n1 as select count(*) as n from public.market_searches where user_id = 'dddddddd-0000-4000-8000-00000000000b';
set local role authenticated;
select public.record_market_search('MBAPPE');
reset role;
select is((select count(*) from public.market_searches where user_id = 'dddddddd-0000-4000-8000-00000000000b'),
  (select n from n1), 'Même recherche dans l''heure : comptée une seule fois');

select * from finish();
rollback;
