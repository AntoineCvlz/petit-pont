-- Connexion Discord : profil créé automatiquement, pseudo dérivé du compte Discord, jamais d'échec.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Nom affiché Discord (global_name) prioritaire, caractères non autorisés retirés
insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000001', 'zizou@example.test',
  '{"iss":"https://discord.com/api","name":"zizou_10#0","full_name":"Zizou 10 ⚽","custom_claims":{"global_name":"Zizou 10 ⚽"}}');
select is((select username from public.profiles where id = 'd1000000-0000-4000-8000-000000000001'), 'Zizou10',
  'Pseudo dérivé du nom affiché Discord');
select is((select coins from public.profiles where id = 'd1000000-0000-4000-8000-000000000001'), 1000::bigint,
  'Solde de départ crédité à la première connexion Discord');

-- Même nom : suffixe numérique pour rester unique
insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000002', 'zizou2@example.test',
  '{"name":"zizou10","custom_claims":{"global_name":"Zizou10"}}');
select matches((select username from public.profiles where id = 'd1000000-0000-4000-8000-000000000002'),
  '^Zizou10[0-9]{4}$', 'Pseudo déjà pris : suffixe numérique');

-- Nom affiché trop court : repli sur l'identifiant Discord
insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000003', 'ab@example.test',
  '{"name":"le.roi.du.lob","custom_claims":{"global_name":"🔥"}}');
select is((select username from public.profiles where id = 'd1000000-0000-4000-8000-000000000003'), 'le.roi.du.lob',
  'Repli sur l''identifiant Discord');

-- Nom interdit : repli sur le candidat suivant (partie locale de l'e-mail)
insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000004', 'gentil.joueur@example.test',
  '{"name":"connard","custom_claims":{"global_name":"connard"}}');
select is((select username from public.profiles where id = 'd1000000-0000-4000-8000-000000000004'), 'gentil.joueur',
  'Mots interdits jamais repris de Discord');

-- Rien d'exploitable : pseudo générique
insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000005', null, '{"name":"★"}');
select matches((select username from public.profiles where id = 'd1000000-0000-4000-8000-000000000005'),
  '^Joueur[0-9]{6}$', 'Pseudo générique en dernier recours');

-- Nom trop long : tronqué à 20 caractères
insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000006', 'long@example.test',
  '{"custom_claims":{"global_name":"UnPseudoBeaucoupTropLongPourLeJeu"}}');
select is((select username from public.profiles where id = 'd1000000-0000-4000-8000-000000000006'), 'UnPseudoBeaucoupTrop',
  'Pseudo tronqué à 20 caractères');

-- Inscription par e-mail : le pseudo choisi reste validé strictement
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'z@example.test', '{"username":"Zizou10"}')$$,
  'P0001', 'Ce pseudo est déjà pris.', 'Pseudo choisi (e-mail) toujours refusé s''il est pris'
);

-- Photo de profil : copiée depuis l'identité Discord (non modifiable par le joueur)
insert into auth.identities (provider_id, user_id, identity_data, provider)
values ('111111111111111111', 'd1000000-0000-4000-8000-000000000001',
  '{"sub":"111111111111111111","avatar_url":"https://cdn.discordapp.com/avatars/111111111111111111/0123456789abcdef0123456789abcdef.png"}', 'discord');
select is((select avatar_url from public.profiles where id = 'd1000000-0000-4000-8000-000000000001'),
  'https://cdn.discordapp.com/avatars/111111111111111111/0123456789abcdef0123456789abcdef.png',
  'Avatar Discord copié à la première connexion');

update auth.identities set identity_data = identity_data || '{"avatar_url":"https://cdn.discordapp.com/embed/avatars/3.png"}'
where provider_id = '111111111111111111';
select is((select avatar_url from public.profiles where id = 'd1000000-0000-4000-8000-000000000001'),
  'https://cdn.discordapp.com/embed/avatars/3.png', 'Avatar mis à jour à la reconnexion');

update auth.identities set identity_data = identity_data || '{"avatar_url":"https://tracker.example/pixel.png"}'
where provider_id = '111111111111111111';
select is((select avatar_url from public.profiles where id = 'd1000000-0000-4000-8000-000000000001'), null,
  'URL hors CDN Discord refusée');

select is(has_column_privilege('authenticated', 'public.profiles', 'avatar_url', 'UPDATE'), false,
  'Un joueur ne peut pas choisir son avatar lui-même');
select throws_ok(
  $$update public.profiles set avatar_url = 'https://evil.example/a.png' where id = 'd1000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'Contrainte : avatar hors CDN Discord impossible'
);

select * from finish();
rollback;
