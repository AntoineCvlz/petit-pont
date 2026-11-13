-- Mode Draft : propositions, choix, collectif (liens vert / orange / rouge), score, limite quotidienne, classement.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dfdfdfdf-0000-4000-8000-00000000000a', 'drafteur@example.test', '{"username":"Drafteur"}'),
  ('dfdfdfdf-0000-4000-8000-00000000000b', 'curieux@example.test', '{"username":"Curieux"}');

-- --- Ligues et liens -------------------------------------------------------------
select is((select count(*)::int from public.clubs where league_id is null), 0, 'Chaque club a une ligue');

create temporary table t as select
  (select ct.id from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.slug = 'mbappe' and ct.edition = 'Base') as mbappe_rma,              -- FRA, Real (LaLiga)
  (select ct.id from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.slug = 'vinicius-jr' and ct.edition = 'Base') as vini_rma,           -- BRA, Real (LaLiga)
  (select ct.id from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.slug = 'kounde' and ct.edition = 'Base') as kounde_fcb,              -- FRA, Barça (LaLiga)
  (select ct.id from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.slug = 'raphinha' and ct.edition = 'Base') as raphinha_fcb,          -- BRA, Barça (LaLiga)
  (select ct.id from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.slug = 'saka' and ct.edition = 'Base') as saka_ars,                  -- ENG, Arsenal (PL)
  (select ct.id from public.card_templates ct join public.players p on p.id = ct.player_id
   where p.slug = 'dembele' and ct.edition = 'Base') as dembele_psg;            -- FRA, PSG (L1)
grant select on t to authenticated;

select is(public._draft_link((select mbappe_rma from t), (select vini_rma from t)), 2::smallint, 'Même club : lien vert');
select is(public._draft_link((select mbappe_rma from t), (select kounde_fcb from t)), 2::smallint, 'Même ligue et même nation : lien vert');
select is(public._draft_link((select mbappe_rma from t), (select raphinha_fcb from t)), 1::smallint, 'Même ligue seulement : lien orange');
select is(public._draft_link((select mbappe_rma from t), (select dembele_psg from t)), 1::smallint, 'Même nation seulement : lien orange');
select is(public._draft_link((select vini_rma from t), (select saka_ars from t)), 0::smallint, 'Rien en commun : lien rouge');

-- --- Parcours complet --------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"dfdfdfdf-0000-4000-8000-00000000000a","role":"authenticated"}';

select throws_ok($$select public.start_draft('999')$$, 'P0001', 'Formation inconnue', 'Formation inconnue refusée');
select is((public.draft_status() ->> 'remaining')::int, 5, '5 drafts disponibles par jour');

create temporary table s (state jsonb);
grant all on s to authenticated;
insert into s select public.start_draft('433');
select is((select jsonb_array_length(state -> 'offer') from s), 5, '5 cartes proposées');
select is(
  (select count(*)::int from public.card_templates ct join public.players p on p.id = ct.player_id
   where ct.id in (select jsonb_array_elements_text(state -> 'offer')::int from s) and p.position = 'GB'),
  5, 'Premier poste : 5 gardiens');
select throws_ok($$select public.start_draft('442')$$, 'P0001', null, 'Un seul draft en cours à la fois');
select throws_ok($$select public.draft_pick((select (state ->> 'id')::uuid from s), 6)$$, 'P0001', 'Choix invalide', 'Index hors des propositions refusé');

-- Un autre joueur ne voit ni ne joue le draft en cours
set local request.jwt.claims to '{"sub":"dfdfdfdf-0000-4000-8000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.drafts where id = (select (state ->> 'id')::uuid from s)), 0, 'Draft en cours invisible pour les autres');
select throws_ok($$select public.draft_pick((select (state ->> 'id')::uuid from s), 1)$$, 'P0001', 'Draft introuvable', 'Impossible de jouer le draft d''un autre');

-- Onze choix : chaque proposition correspond au poste, jamais deux fois le même footballeur
set local request.jwt.claims to '{"sub":"dfdfdfdf-0000-4000-8000-00000000000a","role":"authenticated"}';
create temporary table wrong_pos (n int);
grant all on wrong_pos to authenticated;
do $$
declare
  v_state jsonb := (select state from s);
  v_pos text;
  i int;
begin
  for i in 0..10 loop
    select f.slots -> i ->> 'pos' into v_pos from public.draft_formations f where f.code = '433';
    insert into wrong_pos
    select count(*) from public.card_templates ct join public.players p on p.id = ct.player_id
    where ct.id in (select jsonb_array_elements_text(v_state -> 'offer')::int) and p.position::text <> v_pos;
    v_state := public.draft_pick((v_state ->> 'id')::uuid, 1 + (i % 3));
  end loop;
  update s set state = v_state;
end;
$$;
select is((select sum(n)::int from wrong_pos), 0, 'Toutes les propositions correspondent au poste');
select is((select state ->> 'status' from s), 'completed', 'Draft terminé après 11 choix');
select is((select count(distinct ct.player_id)::int from public.draft_picks dp join public.card_templates ct on ct.id = dp.template_id
           where dp.draft_id = (select (state ->> 'id')::uuid from s)), 11, '11 footballeurs différents');
select ok((select (state ->> 'chemistry')::int between 0 and 100 from s), 'Collectif entre 0 et 100');
select is((select (state ->> 'score')::numeric from s),
          (select round((state ->> 'rating')::numeric + (state ->> 'chemistry')::numeric / 20, 2) from s),
          'Score = note + collectif / 20');
select throws_ok($$select public.draft_pick((select (state ->> 'id')::uuid from s), 1)$$, 'P0001', 'Ce draft est terminé', 'Plus de choix après la fin');

-- Le draft terminé est visible des autres (classement)
set local request.jwt.claims to '{"sub":"dfdfdfdf-0000-4000-8000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.draft_picks where draft_id = (select (state ->> 'id')::uuid from s)), 11,
  'Équipe d''un draft terminé consultable');
select ok(exists (select 1 from public.draft_leaderboard(50) where username = 'Drafteur'), 'Le drafteur apparaît au classement');

-- --- Collectif maximal : 11 joueurs du même club --------------------------------------
reset role;
insert into public.drafts (id, user_id, formation, status) values
  ('dfdfdfdf-1111-4000-8000-000000000001', 'dfdfdfdf-0000-4000-8000-00000000000b', '433', 'abandoned');
insert into public.draft_picks (draft_id, slot_key, slot_index, template_id)
select 'dfdfdfdf-1111-4000-8000-000000000001', s.value ->> 'key', (s.ordinality - 1)::smallint, (select mbappe_rma from t)
from public.draft_formations f, jsonb_array_elements(f.slots) with ordinality s where f.code = '433';
select is(public._draft_chemistry('dfdfdfdf-1111-4000-8000-000000000001'), 100::smallint, 'Tous liens verts : collectif 100');
update public.draft_picks set template_id = (select saka_ars from t)
where draft_id = 'dfdfdfdf-1111-4000-8000-000000000001' and slot_key in ('DG', 'DCD', 'MCG', 'MCD', 'BU');
select ok(public._draft_chemistry('dfdfdfdf-1111-4000-8000-000000000001') < 60, 'Liens rouges : collectif en baisse');

-- --- Limite quotidienne ----------------------------------------------------------------
update public.app_settings set value = '2' where key = 'draft_daily_limit';
set local role authenticated;
set local request.jwt.claims to '{"sub":"dfdfdfdf-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.abandon_draft((public.start_draft('442') ->> 'id')::uuid)$$, 'Deuxième draft lancé puis abandonné');
select throws_ok($$select public.start_draft('352')$$, 'P0001', 'Plus de draft disponible aujourd''hui : reviens demain !',
  'Limite quotidienne respectée (abandons compris)');

reset role;
select * from finish();
rollback;
