-- =============================================================================
-- Mercato 2026 + médias (photos des joueurs, écussons des clubs)
--
-- Clubs actuels recoupés entre Wikidata (P54) et l'infobox Wikipédia (novembre 2026).
-- Photos : Wikimedia Commons (licences libres, crédits sur /credits), détourées en buste.
--
-- Ne s'applique qu'à une base déjà peuplée (production) : sur une base vide, le seed
-- (exécuté après les migrations) contient directement ces données.
-- =============================================================================

do $$
begin
  if not exists (select 1 from public.card_templates) then
    return;
  end if;

  -- Nouveaux clubs
  insert into public.clubs (code, name, short_name, city, nation_id, color_primary, color_secondary)
  select c.code, c.name, c.short_name, c.city, n.id, c.p, c.s
  from (values
    ('TRA', 'Trabzonspor',           'TRA', 'Trabzon',        'TUR', '#7A1F3D', '#4FA9DB'),
    ('CHI', 'Chicago Fire',          'CHI', 'Chicago',        null,  '#C8102E', '#9BC9EC'),
    ('ORL', 'Orlando City',          'ORL', 'Orlando',        null,  '#633492', '#FDE192'),
    ('SHA', 'Al-Shamal',             'SHA', 'Al Shamal',      null,  '#D71920', '#FFFFFF'),
    ('FEN', 'Fenerbahçe',            'FEN', 'Istanbul',       'TUR', '#163962', '#FFED00'),
    ('DEP', 'Deportivo La Corogne',  'DEP', 'La Corogne',     'ESP', '#1B5CA8', '#FFFFFF'),
    ('ROM', 'AS Rome',               'ROM', 'Rome',           'ITA', '#8E1F2F', '#F0BC42'),
    ('RBL', 'RB Leipzig',            'RBL', 'Leipzig',        'GER', '#FFFFFF', '#DD0741'),
    ('BJK', 'Beşiktaş',              'BJK', 'Istanbul',       'TUR', '#000000', '#FFFFFF')
  ) as c(code, name, short_name, city, nation, p, s)
  left join public.nations n on n.code = c.nation
  on conflict (code) do nothing;

  -- Transferts : toutes les cartes « Saison 2026 » du joueur passent dans son club actuel
  create temporary table tmp_transfers (slug text, club text) on commit drop;
  insert into tmp_transfers values
    ('salah', 'TRA'), ('rodri', 'FCB'), ('lewandowski', 'CHI'), ('griezmann', 'ORL'),
    ('rafael-leao', 'GAL'), ('enzo-fernandez', 'MCI'), ('ter-stegen', 'AJX'), ('benzema', 'HIL'),
    ('barcola', 'LIV'), ('mahrez', 'SHA'), ('lukaku', 'FEN'), ('aubameyang', 'DEP'), ('rulli', 'MCI'),
    ('balerdi', 'ROM'), ('konate', 'RMA'), ('nkunku', 'RBL'), ('jonathan-david', 'ATM'),
    ('vlahovic', 'BJK'), ('martinelli', 'HIL'), ('tonali', 'TOT'), ('bruno-guimaraes', 'ARS'),
    ('bernardo-silva', 'RMA'), ('lookman', 'ATM'), ('marmoush', 'TOT'), ('lee-kang-in', 'ATM'),
    ('kessie', 'ATA');

  update public.card_templates ct
  set club_id = c.id
  from tmp_transfers t
  join public.players p on p.slug = t.slug
  join public.clubs c on c.code = t.club
  where ct.player_id = p.id and ct.season = 'Saison 2026';

  -- Parcours : nouveau club (2026 →), anciens clubs encore « en cours » terminés en 2026
  update public.player_clubs pc
  set end_year = 2026
  from tmp_transfers t
  join public.players p on p.slug = t.slug
  join public.clubs c on c.code = t.club
  where pc.player_id = p.id and pc.club_id <> c.id and pc.end_year is null;

  insert into public.player_clubs (player_id, club_id, start_year)
  select p.id, c.id, 2026
  from tmp_transfers t
  join public.players p on p.slug = t.slug
  join public.clubs c on c.code = t.club
  on conflict (player_id, club_id) do update set start_year = coalesce(public.player_clubs.start_year, 2026), end_year = null;

  -- Benzema : libre depuis le 31 août 2026, carte rattachée à son dernier club (Al-Hilal)
  update public.player_clubs pc set end_year = 2026
  from public.players p, public.clubs c
  where p.slug = 'benzema' and c.code = 'HIL' and pc.player_id = p.id and pc.club_id = c.id;

  -- Albums de club : effectif « Saison 2026 » recalculé, cases renumérotées
  delete from public.album_slots s
  using public.albums a, public.card_templates ct, public.clubs c
  where s.album_id = a.id and s.template_id = ct.id
    and ((a.slug = 'paris-saint-germain' and c.code = 'PSG') or (a.slug = 'real-madrid' and c.code = 'RMA'))
    and ct.season = 'Saison 2026' and ct.club_id is distinct from c.id;

  insert into public.album_slots (album_id, slot_number, template_id)
  select a.id, 1000 + row_number() over (partition by a.id order by ct.collection_number), ct.id
  from public.albums a
  join public.clubs c on (a.slug = 'paris-saint-germain' and c.code = 'PSG') or (a.slug = 'real-madrid' and c.code = 'RMA')
  join public.card_templates ct on ct.club_id = c.id and ct.season = 'Saison 2026'
  where not exists (select 1 from public.album_slots s where s.album_id = a.id and s.template_id = ct.id);

  with numbered as (
    select s.id, row_number() over (partition by s.album_id order by ct.collection_number) as n
    from public.album_slots s
    join public.albums a on a.id = s.album_id
    join public.card_templates ct on ct.id = s.template_id
    where a.slug in ('paris-saint-germain', 'real-madrid')
  )
  update public.album_slots s set slot_number = 20000 + n from numbered where numbered.id = s.id;
  update public.album_slots s set slot_number = slot_number - 20000
  from public.albums a
  where a.id = s.album_id and a.slug in ('paris-saint-germain', 'real-madrid') and s.slot_number > 20000;

  -- Médias : photos détourées (public/media/players) et écussons (public/media/clubs), crédits sur /credits
  update public.players set image_url = '/media/players/' || slug || '.webp' where image_url is null;
  update public.clubs set crest_url = '/media/clubs/' || code || '.webp' where crest_url is null;
end;
$$;
