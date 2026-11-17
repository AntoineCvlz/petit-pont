-- Boosters à thème : réserve calculée par règle, tirage limité à la réserve, repli si une rareté manque.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('abababab-0000-4000-8000-000000000001', 'theme.a@example.test', '{"username":"ThemeA"}');
select public._apply_coins('abababab-0000-4000-8000-000000000001', 100000, 'admin_adjustment', 'test');

-- Booster de test sans aucune Commune possible (cartes notées 90+), et un booster à réserve vide
insert into public.boosters (slug, name, kind, price, cards_count, category, pool_rule) values
  ('test-elite', 'Élite', 'standard', 100, 5, 'style', '{"rating_min": 90}'),
  ('test-vide', 'Vide', 'standard', 100, 5, 'nation', '{"nation": "XXX"}');
insert into public.booster_odds (booster_id, rarity, probability)
select b.id, o.r::public.rarity, o.p from public.boosters b
cross join (values ('commune', 62.00), ('rare', 26.00), ('epique', 9.00), ('legendaire', 2.30), ('iconique', 0.60), ('speciale', 0.10)) o(r, p)
where b.slug in ('test-elite', 'test-vide');
select ok(public.refresh_booster_pools() > 0, 'Réserves calculées');
select is((select count(*)::int from public.booster_cards bc join public.boosters b on b.id = bc.booster_id where b.slug = 'test-vide'), 0,
  'Règle sans correspondance : réserve vide');

create temporary table res (n int, r jsonb);
grant select, insert on res to authenticated;
set local role authenticated;
set local request.jwt.claims to '{"sub":"abababab-0000-4000-8000-000000000001","role":"authenticated"}';

insert into res select g, public.open_booster((select id from public.boosters where slug = 'test-elite')) from generate_series(1, 8) g;
select is((select count(*)::int from res, jsonb_array_elements(r -> 'cards')), 40, 'Élite : 8 boosters ouverts malgré l''absence de Communes');
select ok((select bool_and(ct.rating >= 90) from res, jsonb_array_elements(r -> 'cards') c
  join public.card_templates ct on ct.id = (c ->> 'template_id')::int), 'Élite : uniquement des cartes de la réserve');

insert into res select 100, public.open_booster((select id from public.boosters where slug = 'nation-france'));
select ok((select bool_and(n.code = 'FRA') from res, jsonb_array_elements(r -> 'cards') c
  join public.card_templates ct on ct.id = (c ->> 'template_id')::int
  join public.players p on p.id = ct.player_id join public.nations n on n.id = p.nation_id where res.n = 100),
  'France : uniquement des joueurs français');

select throws_ok($$select public.open_booster((select id from public.boosters where slug = 'test-vide'))$$, 'P0001', null,
  'Réserve vide : booster indisponible, jamais tout le catalogue');

insert into res select 200, public.open_booster((select id from public.boosters where slug = 'ligue-des-champions'));
select ok((select bool_and(cl.code = any (array(select jsonb_array_elements_text(b.pool_rule -> 'clubs'))))
  from res, jsonb_array_elements(r -> 'cards') c
  join public.card_templates ct on ct.id = (c ->> 'template_id')::int
  join public.clubs cl on cl.id = ct.club_id
  cross join (select pool_rule from public.boosters where slug = 'ligue-des-champions') b where res.n = 200),
  'Ligue des champions : uniquement des joueurs des clubs participants');

reset role;
select * from finish();
rollback;
