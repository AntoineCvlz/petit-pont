-- Tournoi de tirs au but : règles de séance, composition depuis sa collection, déroulé, récompenses.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- --- Règles de fin de séance (fonction pure) --------------------------------------
select is(public._penalty_winner(2, 0, 2, 2), null, '2-0 après 2 tirs chacun : pas encore fini (3 tirs restants)');
select is(public._penalty_winner(3, 0, 4, 3), 'player', '3-0, 4 tirs contre 3 : écart irrattrapable');
select is(public._penalty_winner(0, 3, 3, 3), 'opponent', '0-3 après 3 tirs chacun : l''adversaire ne peut plus être rejoint');
select is(public._penalty_winner(4, 3, 5, 4), null, '4-3, l''adversaire a encore un tir');
select is(public._penalty_winner(4, 3, 5, 5), 'player', '4-3 après 5 tirs chacun : victoire');
select is(public._penalty_winner(4, 4, 5, 5), null, '4-4 : mort subite');
select is(public._penalty_winner(5, 4, 6, 5), null, 'Mort subite : l''adversaire doit encore tirer');
select is(public._penalty_winner(5, 5, 6, 6), null, 'Mort subite : égalité, on continue');
select is(public._penalty_winner(5, 6, 7, 7), 'opponent', 'Mort subite : défaite après la paire');

-- --- Composition ------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('bcbcbcbc-0000-4000-8000-00000000000a', 'tireur@example.test', '{"username":"Tireur"}'),
  ('bcbcbcbc-0000-4000-8000-00000000000b', 'voisin@example.test', '{"username":"Voisin"}');

-- 6 cartes (5 footballeurs de champ distincts + 1 gardien) pour le tireur, 1 carte pour le voisin
create temporary table mine as
select public._mint_card(x.id, 'bcbcbcbc-0000-4000-8000-00000000000a', 'test') as inst, x.pos
from (
  (select distinct on (ct.player_id) ct.id, 'champ' as pos from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.position <> 'GB' and ct.max_supply is null order by ct.player_id, ct.id limit 5)
  union all
  (select ct.id, 'gb' from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.position = 'GB' and ct.max_supply is null order by ct.id limit 1)
) x;
create temporary table other as
select public._mint_card((select id from public.card_templates where max_supply is null order by id limit 1),
                         'bcbcbcbc-0000-4000-8000-00000000000b', 'test') as inst;
grant select on mine, other to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub":"bcbcbcbc-0000-4000-8000-00000000000a","role":"authenticated"}';

select throws_ok($$select public.start_penalty_tournament((select array_agg(inst) from (select inst from mine where pos = 'champ' limit 4) s),
                                                          (select inst from mine where pos = 'gb'))$$,
  'P0001', 'Choisis 5 tireurs différents et un gardien', '4 tireurs refusés');
select throws_ok($$select public.start_penalty_tournament((select array_agg(inst) from (select inst from mine where pos = 'champ' limit 4) s) || (select inst from other),
                                                          (select inst from mine where pos = 'gb'))$$,
  'P0001', 'Tireurs invalides : 5 footballeurs différents de ta collection', 'Carte d''un autre joueur refusée');
select throws_ok($$select public.start_penalty_tournament((select array_agg(inst) from mine where pos = 'champ'), (select inst from other))$$,
  'P0001', 'Gardien invalide : choisis une carte de ta collection', 'Gardien d''un autre joueur refusé');

create temporary table st (state jsonb);
grant all on st to authenticated;
insert into st select public.start_penalty_tournament((select array_agg(inst) from mine where pos = 'champ'), (select inst from mine where pos = 'gb'));
select is((select state ->> 'round' from st), '1', 'Le tournoi commence en quart de finale');
select is((select jsonb_array_length(state -> 'match' -> 'opp_shooters') from st), 5, 'L''adversaire aligne 5 tireurs');
select throws_ok($$select public.start_penalty_tournament((select array_agg(inst) from mine where pos = 'champ'), (select inst from mine where pos = 'gb'))$$,
  'P0001', 'Termine d''abord ton tournoi en cours', 'Un seul tournoi à la fois');
select throws_ok($$select public.penalty_kick((select (state ->> 'id')::uuid from st), 'lucarne')$$, 'P0001', 'Direction invalide', 'Direction inconnue refusée');

-- Le voisin ne peut pas jouer à sa place
set local request.jwt.claims to '{"sub":"bcbcbcbc-0000-4000-8000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.penalty_kick((select (state ->> 'id')::uuid from st), 'gauche')$$, 'P0001', 'Tournoi introuvable', 'Impossible de tirer pour un autre');
select is((select count(*)::int from public.penalty_tournaments), 0, 'Tournoi d''un autre joueur invisible');

-- Jouer jusqu'au bout (directions variées)
set local request.jwt.claims to '{"sub":"bcbcbcbc-0000-4000-8000-00000000000a","role":"authenticated"}';
do $$
declare
  v_id uuid := (select (state ->> 'id')::uuid from st);
  v_state jsonb;
  i int := 0;
begin
  loop
    v_state := public.penalty_kick(v_id, (array['gauche', 'centre', 'droite'])[1 + i % 3]);
    i := i + 1;
    exit when v_state ->> 'status' <> 'playing' or i > 400;
  end loop;
  update st set state = v_state;
end;
$$;

select ok((select state ->> 'status' in ('won', 'lost') from st), 'Le tournoi se termine');
select is((select count(*)::int from public.penalty_matches m where m.tournament_id = (select (state ->> 'id')::uuid from st) and m.status = 'playing'),
  0, 'Aucun match laissé en cours');
select is(
  (select count(*)::int from public.penalty_matches m
   where m.tournament_id = (select (state ->> 'id')::uuid from st)
     and (m.player_score <> (select count(*) from public.penalty_kicks k where k.match_id = m.id and k.side = 'player' and k.result = 'goal')
       or m.opp_score <> (select count(*) from public.penalty_kicks k where k.match_id = m.id and k.side = 'opponent' and k.result = 'goal'))),
  0, 'Scores conformes aux tirs');
select is(
  (select count(*)::int from public.penalty_matches m
   where m.tournament_id = (select (state ->> 'id')::uuid from st)
     and ((m.status = 'won' and m.player_score <= m.opp_score) or (m.status = 'lost' and m.player_score >= m.opp_score))),
  0, 'Le vainqueur a marqué plus de buts');
select is(
  (select count(*)::int from public.penalty_kicks k join public.penalty_matches m on m.id = k.match_id
   where m.tournament_id = (select (state ->> 'id')::uuid from st)
     and k.side <> case when k.n % 2 = 0 then 'player' else 'opponent' end),
  0, 'Tirs alternés, le joueur commence');
select ok((select bool_and(r1.max_r <= r2.min_r)
           from (select max(ct.rating) as max_r from public.penalty_matches m, unnest(m.opp_shooters) s join public.card_templates ct on ct.id = s
                 where m.tournament_id = (select (state ->> 'id')::uuid from st) and m.round = 1) r1,
                (select coalesce(min(ct.rating), 99) as min_r from public.penalty_matches m, unnest(m.opp_shooters) s join public.card_templates ct on ct.id = s
                 where m.tournament_id = (select (state ->> 'id')::uuid from st) and m.round = 3) r2),
  'Adversaire de finale au moins aussi fort que celui du quart');

-- Récompense : selon le tour atteint, créditée via le journal
select is((select reward from public.penalty_tournaments where id = (select (state ->> 'id')::uuid from st)),
  (select case when t.status = 'won' then 250 else (array[0, 50, 100])[t.round] end::bigint
   from public.penalty_tournaments t where t.id = (select (state ->> 'id')::uuid from st)),
  'Récompense du tour atteint');
select is((select coalesce(sum(amount), 0)::bigint from public.coin_transactions where type = 'minigame_reward'),
  (select reward from public.penalty_tournaments where id = (select (state ->> 'id')::uuid from st)),
  'Récompense versée dans le journal des pièces');
select is((public.penalty_status() ->> 'remaining')::int, 4, 'Un tournoi décompté de la limite du jour');

-- Abandon
select lives_ok($$select public.abandon_penalty_tournament((public.start_penalty_tournament(
  (select array_agg(inst) from mine where pos = 'champ'), (select inst from mine where pos = 'gb')) ->> 'id')::uuid)$$,
  'Abandon d''un tournoi');

reset role;
select * from finish();
rollback;
