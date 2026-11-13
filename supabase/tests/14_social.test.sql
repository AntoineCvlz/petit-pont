-- Social : matchs amicaux (Elo), ligues privées, clans, webhook Discord.
begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

-- 4 joueurs, chacun avec un onze complet (11 footballeurs distincts)
insert into auth.users (id, email, raw_user_meta_data) values
  ('5a5a5a5a-0000-4000-8000-000000000001', 's1@example.test', '{"username":"Social1"}'),
  ('5a5a5a5a-0000-4000-8000-000000000002', 's2@example.test', '{"username":"Social2"}'),
  ('5a5a5a5a-0000-4000-8000-000000000003', 's3@example.test', '{"username":"Social3"}'),
  ('5a5a5a5a-0000-4000-8000-000000000004', 's4@example.test', '{"username":"Social4"}');

do $$
declare
  u uuid;
  v_slots jsonb;
begin
  foreach u in array array['5a5a5a5a-0000-4000-8000-000000000001', '5a5a5a5a-0000-4000-8000-000000000002',
                           '5a5a5a5a-0000-4000-8000-000000000003']::uuid[]
  loop
    select jsonb_object_agg(s.value ->> 'key', public._mint_card(t.id, u, 'test'))
    into v_slots
    from (select value, ordinality from public.draft_formations f, jsonb_array_elements(f.slots) with ordinality where f.code = '433') s
    join (select id, row_number() over (order by id) as rn
          from (select distinct on (player_id) id from public.card_templates where max_supply is null order by player_id, id limit 11) x) t
      on t.rn = s.ordinality;
    insert into public.season_squads (user_id, formation, slots) values (u, '433', v_slots);
  end loop;
end;
$$;

create temporary table ids as select
  '5a5a5a5a-0000-4000-8000-000000000001'::uuid as u1, '5a5a5a5a-0000-4000-8000-000000000002'::uuid as u2,
  '5a5a5a5a-0000-4000-8000-000000000003'::uuid as u3, '5a5a5a5a-0000-4000-8000-000000000004'::uuid as u4;
create temporary table st (k text primary key, v text);
grant select on ids to authenticated;
grant all on st to authenticated;

-- --- Matchs amicaux --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$select public.challenge_player((select u2 from ids), array['pressing'])$$, 'P0001', 'Choisis une tactique par mi-temps', 'Deux tactiques requises');
select throws_ok($$select public.challenge_player((select u1 from ids), array['pressing', 'contre'])$$, 'P0001', 'Joueur introuvable', 'Impossible de se défier soi-même');
insert into st select 'duel', public.challenge_player((select u2 from ids), array['pressing', 'contre'])::text;
select throws_ok($$select public.challenge_player((select u2 from ids), array['pressing', 'contre'])$$, 'P0001', 'Un défi est déjà en cours avec ce joueur', 'Un seul défi à la fois par adversaire');

set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$select public.challenge_player((select u1 from ids), array['pressing', 'contre'])$$, 'P0001', 'Compose d''abord ton onze (page Saison)', 'Pas de défi sans équipe');
select throws_ok($$select public.play_duel((select v::uuid from st where k = 'duel'), array['pressing', 'pressing'])$$, 'P0001', 'Match introuvable', 'Un tiers ne joue pas le match');

set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000002","role":"authenticated"}';
select is((public.duel_detail((select v::uuid from st where k = 'duel')) -> 'home_tactics'), 'null'::jsonb, 'Tactiques adverses cachées avant le match');
select throws_ok($$select home_tactics from public.duels$$, '42501', null, 'Colonnes de tactiques illisibles directement');
select is((public.play_duel((select v::uuid from st where k = 'duel'), array['possession', 'pressing']) ->> 'status'), 'played', 'Match joué dès la réponse');
select is((public.duel_detail((select v::uuid from st where k = 'duel')) -> 'home_tactics'), '["pressing", "contre"]'::jsonb, 'Tactiques révélées après le match');
select is((select (home_elo_delta + away_elo_delta)::int from public.duels where id = (select v::uuid from st where k = 'duel')), 0, 'Elo : ce que l''un gagne, l''autre le perd');
select is((select sum(elo)::int from public.profiles where id in ((select u1 from ids), (select u2 from ids))), 2000, 'Somme des Elo conservée');
select ok(exists (select 1 from public.elo_leaderboard(50) where username = 'Social2'), 'Classement Elo alimenté');

-- Refus d'un défi
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000003","role":"authenticated"}';
insert into st select 'duel2', public.challenge_player((select u2 from ids), array['contre', 'contre'])::text;
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok($$select public.decline_duel((select v::uuid from st where k = 'duel2'))$$, 'Défi refusé');
select is((select status from public.duels where id = (select v::uuid from st where k = 'duel2')), 'declined', 'Statut « refusé »');

-- Blocage
reset role;
insert into public.blocks (blocker_id, blocked_id) values ('5a5a5a5a-0000-4000-8000-000000000003', '5a5a5a5a-0000-4000-8000-000000000001');
set local role authenticated;
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$select public.challenge_player((select u3 from ids), array['contre', 'contre'])$$, 'P0001', 'Impossible de défier ce joueur', 'Un joueur bloqué ne peut pas être défié');

-- --- Ligue privée ----------------------------------------------------------------------------
insert into st select 'league', public.create_league('Ligue des potes')::text;
select is((select count(*)::int from public.private_league_members where league_id = (select v::uuid from st where k = 'league')), 1, 'Le créateur est membre');
reset role;
insert into st select 'code', invite_code from public.private_leagues where id = (select v::uuid from st where k = 'league');
set local role authenticated;
select throws_ok($$select public.start_league((select v::uuid from st where k = 'league'))$$, 'P0001', 'Il faut au moins 3 joueurs', 'Pas de ligue à moins de 3');
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$select public.join_league('ZZZZZZ')$$, 'P0001', 'Code de ligue inconnu', 'Code inconnu refusé');
select lives_ok($$select public.join_league((select v from st where k = 'code'))$$, 'Joueur 2 rejoint la ligue');
select throws_ok($$select public.start_league((select v::uuid from st where k = 'league'))$$, 'P0001', 'Seul le créateur peut lancer la ligue', 'Seul le créateur lance');
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok($$select public.join_league((select v from st where k = 'code'))$$, 'Joueur 3 rejoint la ligue');
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$select public.start_league((select v::uuid from st where k = 'league'))$$, 'Ligue lancée');
select is((select count(*)::int from public.duels where league_id = (select v::uuid from st where k = 'league')), 6, '3 joueurs : 6 matchs aller-retour');
select is((select count(*)::int from (select home_id, away_id from public.duels where league_id = (select v::uuid from st where k = 'league')
           group by 1, 2) s), 6, 'Chaque affiche à domicile une seule fois');
select is((select count(distinct round)::int from public.duels where league_id = (select v::uuid from st where k = 'league')), 6,
  'Une journée par match avec un exempt');
select throws_ok($$select public.join_league((select v from st where k = 'code'))$$, 'P0001', null, 'Plus d''inscription après le lancement');

-- Le joueur 4 (hors ligue) ne voit rien
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000004","role":"authenticated"}';
select is(public.league_detail((select v::uuid from st where k = 'league')), null, 'Ligue invisible pour les non-membres');

-- Échéance : tous les matchs joués d'office, ligue terminée avec un vainqueur
reset role;
update public.duels set deadline = now() - interval '1 minute' where league_id = (select v::uuid from st where k = 'league');
select is(public.resolve_due_duels(), 6, 'Matchs en retard joués d''office');
select is((select status from public.private_leagues where id = (select v::uuid from st where k = 'league')), 'finished', 'Ligue terminée');
select ok((select winner_id is not null from public.private_leagues where id = (select v::uuid from st where k = 'league')), 'Vainqueur désigné');
select is((select sum(played)::int from public.private_league_members where league_id = (select v::uuid from st where k = 'league')), 12,
  'Classement : 4 matchs joués par joueur');

-- --- Clans --------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$select public.create_clan('Les Ultras', 'TROPLONG', null, true)$$, 'P0001', null, 'Sigle trop long refusé');
insert into st select 'clan', public.create_clan('Les Ultras', 'ULT', 'On ouvre tout', false)::text;
select throws_ok($$select public.create_clan('Autre clan', 'AUT', null, true)$$, 'P0001', 'Quitte d''abord ton clan actuel', 'Un seul clan par joueur');

set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$select public.join_clan((select v::uuid from st where k = 'clan'))$$, 'P0001', 'Ce clan est sur invitation : demande son code', 'Clan fermé : code requis');
select is((public.clan_detail((select v::uuid from st where k = 'clan')) ->> 'invite_code'), null, 'Code invisible pour un non-membre');
reset role;
insert into st select 'clancode', invite_code from public.clans where id = (select v::uuid from st where k = 'clan');
set local role authenticated;
select lives_ok($$select public.join_clan(null, (select v from st where k = 'clancode'))$$, 'Rejoint avec le code');
select lives_ok($$select public.post_clan_message('Salut la team')$$, 'Message posté');
select throws_ok($$select public.post_clan_message('Encore')$$, 'P0001', 'Doucement : un message toutes les 3 secondes', 'Anti-flood');

-- Objectif hebdomadaire : forcé sur « ouvrir des boosters », cible 2
reset role;
select public._clan_goal((select v::uuid from st where k = 'clan'));
update public.clan_goals set event = 'open_booster', target = 2, title = 'Test' where clan_id = (select v::uuid from st where k = 'clan');
select public._mission_event('5a5a5a5a-0000-4000-8000-000000000001', 'open_booster');
select public._mission_event('5a5a5a5a-0000-4000-8000-000000000002', 'open_booster');
select ok((select completed_at is not null from public.clan_goals where clan_id = (select v::uuid from st where k = 'clan')), 'Objectif de clan atteint');
select is((select count(*)::int from public.booster_grants g where g.user_id in ('5a5a5a5a-0000-4000-8000-000000000001', '5a5a5a5a-0000-4000-8000-000000000002')
           and g.reason like 'Objectif de clan%'), 2, 'Un pack pour chaque contributeur');

set local role authenticated;
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000004","role":"authenticated"}';
select is((select count(*)::int from public.clan_messages), 0, 'Discussion invisible hors du clan');

-- Le chef quitte : la direction passe au membre suivant
set local request.jwt.claims to '{"sub":"5a5a5a5a-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$select public.leave_clan()$$, 'Le chef quitte le clan');
select is((select owner_id from public.clans where id = (select v::uuid from st where k = 'clan')),
  '5a5a5a5a-0000-4000-8000-000000000002'::uuid, 'Direction transmise');

-- --- Discord ------------------------------------------------------------------------------------
select throws_ok($$select public.admin_set_discord_webhook('https://discord.com/api/webhooks/1/abc')$$, '42501', null, 'Webhook : réservé aux admins');
select throws_ok($$select * from public.private_settings$$, '42501', null, 'Paramètres privés illisibles');

reset role;
select * from finish();
rollback;
