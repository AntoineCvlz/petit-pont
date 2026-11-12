-- Tests phase 3 : progression d'album et récompense de complétion.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'album.a@example.test', '{"username":"AlbumA"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'album.b@example.test', '{"username":"AlbumB"}');

-- Petit album de test : 3 cartes communes, 500 pièces
insert into public.albums (slug, name, kind, reward_coins) values ('test-album', 'Album test', 'club', 500);
insert into public.album_slots (album_id, slot_number, template_id)
select (select id from public.albums where slug = 'test-album'), row_number() over (order by id), id
from (select id from public.card_templates where rarity = 'commune' order by id limit 3) t;

create temporary table ctx as
select (select id from public.albums where slug = 'test-album') as album,
       array(select template_id from public.album_slots
             where album_id = (select id from public.albums where slug = 'test-album') order by slot_number) as tpls;
grant select on ctx to authenticated;

-- A possède 2 cartes sur 3
select public._mint_card((select tpls[1] from ctx), 'bbbbbbbb-0000-4000-8000-000000000001', 'test');
select public._mint_card((select tpls[2] from ctx), 'bbbbbbbb-0000-4000-8000-000000000001', 'test');
-- B possède la 3e (ne doit pas compter pour A)
select public._mint_card((select tpls[3] from ctx), 'bbbbbbbb-0000-4000-8000-000000000002', 'test');

select results_eq(
  $$select owned, total from public.album_progress('bbbbbbbb-0000-4000-8000-000000000001', (select album from ctx))$$,
  $$values (2, 3)$$, 'Progression : 2 / 3');

set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$select public.claim_album_reward((select album from ctx))$$, 'P0001',
  'Album incomplet : il manque 1 carte(s)', 'Album incomplet refusé');
reset role;

-- A obtient la dernière carte
select public._mint_card((select tpls[3] from ctx), 'bbbbbbbb-0000-4000-8000-000000000001', 'test');

set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000001","role":"authenticated"}';
select is((public.claim_album_reward((select album from ctx)) ->> 'reward')::int, 500, 'Récompense versée');
select throws_ok($$select public.claim_album_reward((select album from ctx))$$, 'P0001',
  'Récompense déjà réclamée pour cet album', 'Récompense une seule fois');
select throws_ok($$insert into public.album_completions (user_id, album_id) values ('bbbbbbbb-0000-4000-8000-000000000001', 1)$$,
  '42501', null, 'Complétion non insérable par le client');
reset role;

select is((select coins from public.profiles where username = 'AlbumA'), 1500::bigint, 'Solde : 1000 + 500');
select is((select count(*)::int from public.coin_transactions t join public.profiles p on p.id = t.user_id
           where p.username = 'AlbumA' and t.type = 'album_reward'), 1, 'Récompense journalisée');
select is((select count(*)::int from public.album_completions c join public.profiles p on p.id = c.user_id
           where p.username = 'AlbumA'), 1, 'Complétion enregistrée');
select is((select count(*)::int from public.activity_feed f join public.profiles p on p.id = f.user_id
           where p.username = 'AlbumA' and f.type = 'album_completed'), 1, 'Événement publié dans le fil');

-- B (2 cartes manquantes) ne peut rien réclamer
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$select public.claim_album_reward((select album from ctx))$$, 'P0001',
  'Album incomplet : il manque 2 carte(s)', 'Les cartes de A ne comptent pas pour B');
reset role;

select ok((select bool_and(is_consistent) from public.coin_balance_audit), 'Solde = journal');

select * from finish();
rollback;
