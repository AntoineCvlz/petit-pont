-- Tests phase 6 : échanges entre joueurs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-4000-8000-00000000000a', 'tr.a@example.test', '{"username":"TradeA"}'),
  ('eeeeeeee-0000-4000-8000-00000000000b', 'tr.b@example.test', '{"username":"TradeB"}'),
  ('eeeeeeee-0000-4000-8000-00000000000c', 'tr.c@example.test', '{"username":"TradeC"}');

create temporary table c as select
  public._mint_card((select id from public.card_templates where rarity = 'rare' order by id limit 1), 'eeeeeeee-0000-4000-8000-00000000000a', 'test') as a1,
  public._mint_card((select id from public.card_templates where rarity = 'commune' order by id limit 1), 'eeeeeeee-0000-4000-8000-00000000000a', 'test') as a2,
  public._mint_card((select id from public.card_templates where rarity = 'epique' order by id limit 1), 'eeeeeeee-0000-4000-8000-00000000000b', 'test') as b1,
  public._mint_card((select id from public.card_templates where rarity = 'commune' order by id offset 1 limit 1), 'eeeeeeee-0000-4000-8000-00000000000b', 'test') as b2;
create temporary table t (name text, id uuid);
grant select on c to authenticated;
grant select, insert on t to authenticated;

-- --- Propositions invalides ---------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.propose_trade('eeeeeeee-0000-4000-8000-00000000000a', array[(select a1 from c)], '{}')$$,
  'P0001', 'Choisis un autre joueur', 'Échange avec soi-même refusé');
select throws_ok($$select public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b', '{}', '{}', 100, 0)$$,
  'P0001', 'Un échange doit contenir au moins une carte', 'Échange sans carte refusé');
select throws_ok($$select public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b', array[(select b1 from c)], '{}')$$,
  'P0001', 'Une de tes cartes n''est plus disponible (vendue, en vente ou échangée)', 'Offrir la carte d''un autre refusé');
select throws_ok($$select public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b', '{}', array[(select a1 from c)])$$,
  'P0001', 'Une carte demandée n''est plus disponible chez ce joueur', 'Demander une carte que l''autre n''a pas refusé');
select throws_ok($$select public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b', array[(select a1 from c)], '{}', 5000, 0)$$,
  'P0001', 'Tu n''as pas assez de pièces pour cette offre', 'Offrir plus de pièces qu''on n''en a refusé');
select throws_ok($$select public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b', array[(select a1 from c), (select a1 from c)], '{}')$$,
  'P0001', 'Un exemplaire ne peut figurer qu''une fois', 'Doublon dans la proposition refusé');
select throws_ok($$insert into public.trades (proposer_id, recipient_id) values ('eeeeeeee-0000-4000-8000-00000000000a', 'eeeeeeee-0000-4000-8000-00000000000b')$$,
  '42501', null, 'Insertion directe d''un échange refusée');

-- --- Proposition valide : A offre a1 + 100 pièces contre b1 -----------------
insert into t select 'main', public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b',
  array[(select a1 from c)], array[(select b1 from c)], 100, 0, 'Deal ?');
select ok((select id from t where name = 'main') is not null, 'Proposition créée');
reset role;
select is((select is_locked from public.card_instances where id = (select a1 from c)), false, 'Aucun verrouillage à la proposition');
select is((select count(*)::int from public.notifications n join public.profiles p on p.id = n.user_id
           where p.username = 'TradeB' and n.type = 'trade_received'), 1, 'Destinataire notifié');

-- C ne voit pas l'échange (RLS)
set local role authenticated;
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.trades where id = (select id from t where name = 'main')), 0, 'Un tiers ne voit pas l''échange');
select throws_ok($$select public.accept_trade((select id from t where name = 'main'))$$, 'P0001', 'Proposition introuvable',
  'Un tiers ne peut pas accepter');
-- A (proposant) ne peut pas accepter sa propre proposition
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.accept_trade((select id from t where name = 'main'))$$, 'P0001', 'Proposition introuvable',
  'Le proposant ne peut pas accepter');

-- --- Contre-proposition de B : b2 au lieu de b1 -------------------------------
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000b","role":"authenticated"}';
insert into t select 'counter', public.propose_trade('eeeeeeee-0000-4000-8000-00000000000a',
  array[(select b2 from c)], array[(select a1 from c)], 0, 100, 'Plutôt celle-ci', (select id from t where name = 'main'));
reset role;
select is((select status::text from public.trades where id = (select id from t where name = 'main')), 'countered', 'Originale marquée contre-proposée');
select is((select parent_trade_id from public.trades where id = (select id from t where name = 'counter')),
  (select id from t where name = 'main'), 'Contre-proposition liée à l''originale');
set local role authenticated;
select throws_ok($$select public.accept_trade((select id from t where name = 'main'))$$, 'P0001',
  'Cette proposition n''est plus en attente', 'Originale non acceptable');

-- --- A accepte la contre-proposition ------------------------------------------
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.accept_trade((select id from t where name = 'counter'))$$, 'Contre-proposition acceptée');
reset role;
select is((select owner_id from public.card_instances where id = (select b2 from c)), 'eeeeeeee-0000-4000-8000-00000000000a'::uuid, 'b2 chez A');
select is((select owner_id from public.card_instances where id = (select a1 from c)), 'eeeeeeee-0000-4000-8000-00000000000b'::uuid, 'a1 chez B');
select is((select obtained_via from public.card_instances where id = (select a1 from c)), 'trade', 'Provenance : échange');
select is((select coins from public.profiles where username = 'TradeA'), 900::bigint, 'A paie les 100 pièces demandées');
select is((select coins from public.profiles where username = 'TradeB'), 1100::bigint, 'B reçoit les 100 pièces');
select is((select count(*)::int from public.card_instance_history where instance_id = (select a1 from c) and event = 'trade'), 1, 'Historique de l''échange');
select is((select count(*)::int from public.notifications n join public.profiles p on p.id = n.user_id
           where p.username = 'TradeB' and n.type = 'trade_accepted'), 1, 'Proposant notifié de l''acceptation');
select ok((select bool_and(is_consistent) from public.coin_balance_audit), 'Solde = journal');

-- --- Revérification à l'acceptation : carte mise en vente entre-temps ---------
set local role authenticated;
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000b","role":"authenticated"}';
insert into t select 'stale', public.propose_trade('eeeeeeee-0000-4000-8000-00000000000a', array[(select a1 from c)], array[(select a2 from c)]);
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000a","role":"authenticated"}';
select public.create_listing((select a2 from c), 50);
select throws_ok($$select public.accept_trade((select id from t where name = 'stale'))$$, 'P0001',
  'Échange impossible : une carte n''est plus disponible (vendue, en vente ou déjà échangée)', 'Carte en vente : acceptation refusée');
reset role;
select is((select owner_id from public.card_instances where id = (select a1 from c)), 'eeeeeeee-0000-4000-8000-00000000000b'::uuid,
  'Rien n''a bougé après le refus');

-- --- Refus, annulation, expiration --------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.decline_trade((select id from t where name = 'stale'))$$, 'Refus');
insert into t select 'cancel', public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b', array[(select b2 from c)], '{}');
select throws_ok($$select public.decline_trade((select id from t where name = 'cancel'))$$, 'P0001', 'Proposition introuvable',
  'Le proposant ne peut pas refuser');
select lives_ok($$select public.cancel_trade((select id from t where name = 'cancel'))$$, 'Annulation par le proposant');

insert into t select 'old', public.propose_trade('eeeeeeee-0000-4000-8000-00000000000b', array[(select b2 from c)], '{}');
reset role;
update public.trades set expires_at = now() - interval '1 minute' where id = (select id from t where name = 'old');
set local role authenticated;
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.accept_trade((select id from t where name = 'old'))$$, 'P0001', 'Cette proposition a expiré',
  'Proposition expirée non acceptable');
reset role;
select ok(public.expire_trades() >= 1, 'expire_trades marque les propositions échues');
select is((select status::text from public.trades where id = (select id from t where name = 'old')), 'expired', 'Statut expiré');

-- --- Blocage --------------------------------------------------------------------
insert into public.blocks (blocker_id, blocked_id) values ('eeeeeeee-0000-4000-8000-00000000000c', 'eeeeeeee-0000-4000-8000-00000000000a');
set local role authenticated;
set local request.jwt.claims to '{"sub":"eeeeeeee-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.propose_trade('eeeeeeee-0000-4000-8000-00000000000c', array[(select b2 from c)], '{}')$$,
  'P0001', 'Échange impossible avec ce joueur', 'Joueur bloqué : proposition refusée');
reset role;

select * from finish();
rollback;
