-- Tests phase 8 : administration et modération.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('abababab-0000-4000-8000-00000000000a', 'adm.user@example.test', '{"username":"Lambda","is_admin":true}', '{}'),
  ('abababab-0000-4000-8000-00000000000b', 'adm.other@example.test', '{"username":"Autre"}', '{}');

select is((select is_admin from public.profiles where username = 'Lambda'), false, 'is_admin ignoré dans les métadonnées utilisateur');
select is((select is_admin from public.profiles where username = 'Arbitre'), true, 'Compte admin du seed');

create temporary table ids as select
  (select id from public.boosters where slug = 'standard') as booster,
  (select id from public.albums where slug = 'legendes') as album,
  (select id from public.card_templates order by id limit 1) as tpl,
  (select id from public.players order by id limit 1) as player,
  (select max(collection_number) from public.card_templates) as max_num;
grant select on ids to authenticated;

-- --- Joueur non admin ----------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"abababab-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.admin_economy_stats()$$, '42501', null, 'Statistiques : réservé aux admins');
select throws_ok($$select public.admin_purge_demo_accounts()$$, '42501', null, 'Purge : réservée aux admins');
select throws_ok($$select public.admin_set_booster_odds((select booster from ids), '{"commune":100}')$$, '42501', null, 'Probabilités : réservées aux admins');
update public.boosters set price = 1 where id = (select booster from ids);
select is((select price from public.boosters where id = (select booster from ids)), 200, 'Un joueur ne modifie pas un booster (RLS)');
select throws_ok($$insert into public.players (slug, last_name, display_name, nation_id, position) values ('x', 'X', 'X', 1, 'ATT')$$,
  '42501', null, 'Un joueur ne crée pas de footballeur');

-- --- Signalement et blocage ----------------------------------------------------
select lives_ok($$select public.report_player('abababab-0000-4000-8000-00000000000b', 'Pseudo déplacé')$$, 'Signalement');
select throws_ok($$select public.report_player('abababab-0000-4000-8000-00000000000b', 'Encore')$$, 'P0001', null, 'Un seul signalement ouvert par joueur');
select throws_ok($$select public.report_player('abababab-0000-4000-8000-00000000000a', 'Moi')$$, 'P0001', 'Joueur introuvable', 'Se signaler soi-même refusé');
select throws_ok($$select public.report_player('abababab-0000-4000-8000-00000000000b', 'x')$$, 'P0001', null, 'Motif trop court refusé');

reset role;
create temporary table tr as select public._mint_card((select tpl from ids), 'abababab-0000-4000-8000-00000000000b', 'test') as inst;
grant select on tr to authenticated;
set local role authenticated;
set local request.jwt.claims to '{"sub":"abababab-0000-4000-8000-00000000000b","role":"authenticated"}';
select public.propose_trade('abababab-0000-4000-8000-00000000000a', array[(select inst from tr)], '{}');
set local request.jwt.claims to '{"sub":"abababab-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.block_player('abababab-0000-4000-8000-00000000000b')$$, 'Blocage');
reset role;
select is((select count(*)::int from public.trades where proposer_id = 'abababab-0000-4000-8000-00000000000b' and status = 'pending'), 0,
  'Blocage : échanges en attente annulés');
set local role authenticated;
set local request.jwt.claims to '{"sub":"abababab-0000-4000-8000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.propose_trade('abababab-0000-4000-8000-00000000000a', array[(select inst from tr)], '{}')$$,
  'P0001', 'Échange impossible avec ce joueur', 'Joueur bloqué : ne peut plus proposer d''échange');
set local request.jwt.claims to '{"sub":"abababab-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.unblock_player('abababab-0000-4000-8000-00000000000b')$$, 'Déblocage');
set local request.jwt.claims to '{"sub":"abababab-0000-4000-8000-00000000000b","role":"authenticated"}';
select lives_ok($$select public.propose_trade('abababab-0000-4000-8000-00000000000a', array[(select inst from tr)], '{}')$$,
  'Après déblocage : proposition possible');

-- --- Administrateur ------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000ad","role":"authenticated"}';
select ok((public.admin_economy_stats() ->> 'players')::int > 10, 'Statistiques de l''économie');
select is((public.admin_economy_stats() ->> 'inconsistent_balances')::int, 0, 'Aucun solde incohérent');
select ok((select count(*) from public.reports where status = 'open') >= 1, 'L''admin voit les signalements');
select lives_ok($$select public.admin_resolve_report((select id from public.reports where status = 'open' limit 1), 'resolved')$$, 'Signalement traité');

select throws_ok($$select public.admin_set_booster_odds((select booster from ids), '{"commune":60,"rare":30}')$$, 'P0001', null,
  'Probabilités : total différent de 100 refusé');
select throws_ok($$select public.admin_set_booster_odds((select booster from ids), '{"divine":100}')$$, 'P0001', null,
  'Probabilités : rareté inconnue refusée');
select lives_ok($$select public.admin_set_booster_odds((select booster from ids), '{"commune":50,"rare":30,"epique":15,"legendaire":4.5,"iconique":0.4,"speciale":0.1}')$$,
  'Probabilités modifiées (total 100)');

update public.boosters set price = 250 where id = (select booster from ids);
select is((select price from public.boosters where id = (select booster from ids)), 250, 'L''admin modifie un booster');
select throws_ok($$update public.card_templates set minted_count = 0 where id = (select tpl from ids)$$, '42501', null,
  'minted_count jamais modifiable (numéros de série)');

insert into public.card_templates (player_id, season, edition, rarity, rating)
values ((select player from ids), 'Saison 2026', 'Admin', 'rare', 80);
select is((select collection_number from public.card_templates where edition = 'Admin'), (select max_num from ids) + 1,
  'Nouvelle carte : numéro de collection attribué automatiquement');

select is(public.admin_set_album_slots((select album from ids), array[(select max_num from ids) + 1, 1]), 2, 'Emplacements d''album réécrits');
select throws_ok($$select public.admin_set_album_slots((select album from ids), array[99999])$$, 'P0001', null,
  'Numéro de collection inconnu refusé');

-- --- Purge des comptes de démo ---------------------------------------------------
select is(public.admin_purge_demo_accounts(), 12, '12 comptes de démo supprimés');
reset role;
select is((select count(*)::int from public.profiles where is_demo), 0, 'Plus aucun compte de démo');

select * from finish();
rollback;
