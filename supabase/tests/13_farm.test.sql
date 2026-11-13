-- Modes « farm » : défis d'équipe, saison de clubs, missions et boutique à jetons.
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users (id, email, raw_user_meta_data) values
  ('fafafafa-0000-4000-8000-00000000000a', 'farmer@example.test', '{"username":"Fermier"}'),
  ('fafafafa-0000-4000-8000-00000000000b', 'autre@example.test', '{"username":"AutreFermier"}');

-- Cartes du fermier : 11 joueurs de Ligue 1 (footballeurs distincts) + 5 communes quelconques
create temporary table l1 as
select public._mint_card(x.id, 'fafafafa-0000-4000-8000-00000000000a', 'test') as inst
from (select distinct on (ct.player_id) ct.id
      from public.card_templates ct join public.clubs c on c.id = ct.club_id join public.leagues l on l.id = c.league_id
      where l.code = 'L1' and ct.max_supply is null order by ct.player_id, ct.id limit 11) x;
create temporary table any5 as
select public._mint_card(x.id, 'fafafafa-0000-4000-8000-00000000000a', 'test') as inst
from (select ct.id from public.card_templates ct where ct.rarity = 'commune' order by ct.id limit 5) x;
create temporary table theirs as
select public._mint_card((select id from public.card_templates where max_supply is null order by id limit 1),
                         'fafafafa-0000-4000-8000-00000000000b', 'test') as inst;
create temporary table ids as select
  (select id from public.sbc_challenges where slug = 'vide-grenier') as grenier,
  (select id from public.sbc_challenges where slug = 'onze-ligue-1') as ligue1;
grant select on l1, any5, theirs, ids to authenticated;

-- --- Vérification des conditions -------------------------------------------------------
select is(public._sbc_check('{"count": 5}', array[1, 2, 3]), 'Il faut exactement 5 cartes', 'Nombre de cartes vérifié');
select is(public._sbc_check('{"count": 11, "league": "L1"}', (select array_agg(ci.template_id) from public.card_instances ci join l1 on l1.inst = ci.id)),
  null, '11 joueurs de Ligue 1 acceptés');
select alike(public._sbc_check('{"league": "PL"}', (select array_agg(ci.template_id) from public.card_instances ci join l1 on l1.inst = ci.id)),
  'Toutes les cartes doivent venir de %', 'Mauvaise ligue refusée');
select alike(public._sbc_check('{"min_avg_rating": 99}', array[(select min(id) from public.card_templates)]),
  'Note moyenne insuffisante%', 'Note moyenne vérifiée');
select alike(public._sbc_check('{"min_rarity": {"rarity": "iconique", "count": 1}}',
  array[(select id from public.card_templates where rarity = 'commune' limit 1)]), 'Il faut au moins 1 cartes%', 'Rareté vérifiée');
select alike(public._sbc_check('{"distinct_nations": 3}',
  (select array_agg(id) from (select ct.id from public.card_templates ct join public.players p on p.id = ct.player_id
                              join public.nations n on n.id = p.nation_id where n.code = 'FRA' limit 3) s)),
  'Il faut 3 nations différentes', 'Nations différentes vérifiées');

-- --- Défis ------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"fafafafa-0000-4000-8000-00000000000a","role":"authenticated"}';

select throws_ok($$select public.submit_sbc((select grenier from ids), (select array_agg(inst) from any5) || (select inst from theirs))$$,
  'P0001', null, 'Carte d''un autre joueur refusée');
select throws_ok($$select public.submit_sbc((select grenier from ids), (select array_agg(inst) from (select inst from any5 limit 4) s))$$,
  'P0001', 'Il faut exactement 5 cartes', 'Condition non remplie : refus explicite');
select lives_ok($$select public.submit_sbc((select grenier from ids), (select array_agg(inst) from any5))$$, 'Défi « Vide-grenier » réussi');
select is((select count(*)::int from public.card_instances where id in (select inst from any5)), 0, 'Cartes sacrifiées détruites');
select is((select count(*)::int from public.booster_grants b join public.boosters x on x.id = b.booster_id
           where b.user_id = 'fafafafa-0000-4000-8000-00000000000a' and x.slug = 'gratuit' and b.opened_at is null),
  1, 'Pack gagné dans l''inventaire');
select throws_ok($$select public.submit_sbc((select grenier from ids), (select array_agg(inst) from l1 limit 5))$$,
  'P0001', 'Défi déjà réussi pour cette période', 'Défi quotidien : une fois par jour');
select is((select available from public.sbc_list() where slug = 'vide-grenier'), false, 'Défi marqué indisponible');

-- --- Saison ------------------------------------------------------------------------------------
select throws_ok($$select public.start_season()$$, 'P0001', 'Compose d''abord ton onze', 'Pas de saison sans équipe');
create temporary table squad as
select jsonb_object_agg(s.value ->> 'key', x.inst) as slots
from (select value, ordinality from public.draft_formations f, jsonb_array_elements(f.slots) with ordinality where f.code = '433') s
join (select inst, row_number() over (order by inst) as rn from l1) x on x.rn = s.ordinality;
grant select on squad to authenticated;
select throws_ok($$select public.set_season_squad('433', (select slots from squad) || jsonb_build_object('GB', (select inst from theirs)))$$,
  'P0001', 'Toutes les cartes doivent venir de ta collection', 'Carte d''un autre joueur refusée dans l''équipe');
select lives_ok($$select public.set_season_squad('433', (select slots from squad))$$, 'Onze enregistré');
select ok((public.season_status() -> 'team' ->> 'complete')::boolean, 'Équipe complète, force calculée');

reset role;
update public.app_settings set value = '[{"points": 0, "booster": "standard", "count": 1}]' where key = 'season_rewards';
set local role authenticated;

create temporary table season (state jsonb);
grant all on season to authenticated;
insert into season select public.start_season();
select is((select jsonb_array_length(state -> 'run' -> 'fixtures') from season), 10, '10 journées au programme');
select throws_ok($$select public.start_season()$$, 'P0001', 'Une saison est déjà en cours', 'Une seule saison à la fois');
select throws_ok($$select public.season_play_half('catenaccio')$$, 'P0001', 'Tactique inconnue', 'Tactique inconnue refusée');

update season set state = public.season_play_half('pressing');
select is((select state -> 'run' -> 'fixtures' -> 0 ->> 'status' from season), 'half', 'Mi-temps jouée');
select throws_ok($$select public.set_season_squad('442', (select slots from squad))$$, 'P0001', 'Termine d''abord le match en cours',
  'Pas de changement d''équipe à la mi-temps');
update season set state = public.season_play_half('contre');
select is((select state -> 'run' ->> 'matchday' from season), '2', 'Match terminé, journée suivante');
select is((select (state -> 'run' ->> 'points')::int from season),
  (select case when (f ->> 'goals1')::int + (f ->> 'goals2')::int > (f ->> 'opp_goals1')::int + (f ->> 'opp_goals2')::int then 3
               when (f ->> 'goals1')::int + (f ->> 'goals2')::int = (f ->> 'opp_goals1')::int + (f ->> 'opp_goals2')::int then 1 else 0 end
   from (select state -> 'run' -> 'fixtures' -> 0 as f from season) s),
  'Points conformes au score');
select is((select jsonb_array_length(state -> 'run' -> 'rewards_given') from season), 1, 'Palier atteint récompensé une seule fois');

-- Limite quotidienne : 3 matchs
select lives_ok($$select public.season_play_half('possession'); select public.season_play_half('possession');
                  select public.season_play_half('pressing'); select public.season_play_half('pressing')$$, 'Matchs 2 et 3 joués');
select throws_ok($$select public.season_play_half('pressing')$$, 'P0001', null, 'Limite de 3 matchs par jour');

-- --- Missions et boutique -----------------------------------------------------------------------
create temporary table m as select
  (select id from public.missions where slug = 'match-saison') as match_saison,
  (select id from public.missions where slug = 'ouvrir-2') as ouvrir2,
  (select id from public.missions where slug = 'defis-2') as defis2;
grant select on m to authenticated;

select is((select (x ->> 'progress')::int from jsonb_array_elements(public.missions_status() -> 'missions') x where x ->> 'id' = (select match_saison from m)::text),
  1, 'Mission « Joue un match de saison » accomplie automatiquement');
select is((select (x ->> 'progress')::int from jsonb_array_elements(public.missions_status() -> 'missions') x where x ->> 'id' = (select defis2 from m)::text),
  1, 'Défi réussi compté dans la mission hebdomadaire');
select throws_ok($$select public.claim_mission((select ouvrir2 from m))$$, 'P0001', 'Mission pas encore accomplie', 'Pas de récompense avant l''objectif');
select is(public.claim_mission((select match_saison from m)), 10, 'Récompense : 10 jetons');
select throws_ok($$select public.claim_mission((select match_saison from m))$$, 'P0001', 'Récompense déjà récupérée', 'Une seule récompense par période');

-- Ouvrir 2 boosters (dont le pack gagné) fait avancer la mission
select lives_ok($$select public.open_granted_booster((select g.id from public.booster_grants g where g.opened_at is null limit 1));
                  select public.open_granted_booster((select g.id from public.booster_grants g where g.opened_at is null limit 1))$$,
  'Deux packs gagnés ouverts');
select is(public.claim_mission((select ouvrir2 from m)), 20, 'Mission « Ouvre 2 boosters » récompensée');

select throws_ok($$select public.buy_with_tokens('standard')$$, 'P0001', 'Pas assez de jetons', 'Boutique : jetons insuffisants');
reset role;
update public.profiles set tokens = 120 where id = 'fafafafa-0000-4000-8000-00000000000a';
set local role authenticated;
select is(public.buy_with_tokens('standard'), 20, 'Booster Tribune acheté 100 jetons');
select throws_ok($$update public.profiles set tokens = 9999 where id = 'fafafafa-0000-4000-8000-00000000000a'$$,
  '42501', null, 'Un joueur ne modifie pas ses jetons');

-- Un autre joueur ne voit pas ces données
set local request.jwt.claims to '{"sub":"fafafafa-0000-4000-8000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.season_runs) + (select count(*)::int from public.sbc_completions)
          + (select count(*)::int from public.mission_progress), 0, 'Saison, défis et missions privés');

reset role;
select * from finish();
rollback;
