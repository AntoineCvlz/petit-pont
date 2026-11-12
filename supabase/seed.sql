-- =============================================================================
-- Petit Pont — seed de démonstration
-- Données illustratives (effectifs « Saison 2026 » fictifs, pas de photos ni logos).
-- Déterministe : setseed() fixe le tirage des collections de démo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Mots interdits (pseudos) — sous-chaînes recherchées dans le pseudo normalisé
-- -----------------------------------------------------------------------------
insert into public.banned_words (word) values
  ('connard'), ('connasse'), ('salope'), ('encule'), ('enkule'), ('nazi'), ('hitler'),
  ('merde'), ('batard'), ('fuck'), ('bitch'), ('admin'), ('moderateur');

-- -----------------------------------------------------------------------------
-- Nations (drapeaux stylisés)
-- -----------------------------------------------------------------------------
insert into public.nations (code, name, flag_colors, flag_layout) values
  ('FRA', 'France',          '{#0055A4,#FFFFFF,#EF4135}', 'v'),
  ('ARG', 'Argentine',       '{#74ACDF,#FFFFFF,#74ACDF}', 'h'),
  ('POR', 'Portugal',        '{#006600,#FF0000}', 'v'),
  ('BRA', 'Brésil',          '{#009C3B,#FFDF00,#002776}', 'h'),
  ('NOR', 'Norvège',         '{#BA0C2F,#FFFFFF,#00205B}', 'nordic'),
  ('ESP', 'Espagne',         '{#AA151B,#F1BF00,#AA151B}', 'h'),
  ('ENG', 'Angleterre',      '{#FFFFFF,#CE1124}', 'cross'),
  ('GER', 'Allemagne',       '{#000000,#DD0000,#FFCE00}', 'h'),
  ('ITA', 'Italie',          '{#009246,#FFFFFF,#CE2B37}', 'v'),
  ('BEL', 'Belgique',        '{#000000,#FDDA24,#EF3340}', 'v'),
  ('NED', 'Pays-Bas',        '{#AE1C28,#FFFFFF,#21468B}', 'h'),
  ('CRO', 'Croatie',         '{#FF0000,#FFFFFF,#171796}', 'h'),
  ('EGY', 'Égypte',          '{#CE1126,#FFFFFF,#000000}', 'h'),
  ('POL', 'Pologne',         '{#FFFFFF,#DC143C}', 'h'),
  ('URU', 'Uruguay',         '{#FFFFFF,#0038A8,#FFFFFF,#0038A8}', 'h'),
  ('SEN', 'Sénégal',         '{#00853F,#FDEF42,#E31B23}', 'v'),
  ('MAR', 'Maroc',           '{#C1272D,#006233,#C1272D}', 'h'),
  ('KOR', 'Corée du Sud',    '{#FFFFFF,#CD2E3A}', 'disc'),
  ('NGA', 'Nigeria',         '{#008751,#FFFFFF,#008751}', 'v'),
  ('GEO', 'Géorgie',         '{#FFFFFF,#FF0000}', 'cross'),
  ('SWE', 'Suède',           '{#006AA7,#FECC02}', 'nordic'),
  ('DEN', 'Danemark',        '{#C8102E,#FFFFFF}', 'nordic'),
  ('CAN', 'Canada',          '{#FF0000,#FFFFFF,#FF0000}', 'v'),
  ('JPN', 'Japon',           '{#FFFFFF,#BC002D}', 'disc'),
  ('COL', 'Colombie',        '{#FCD116,#003893,#CE1126}', 'h'),
  ('ALG', 'Algérie',         '{#006233,#FFFFFF}', 'v'),
  ('CIV', 'Côte d''Ivoire',  '{#F77F00,#FFFFFF,#009E60}', 'v'),
  ('CMR', 'Cameroun',        '{#007A5E,#CE1126,#FCD116}', 'v'),
  ('SRB', 'Serbie',          '{#C6363C,#0C4076,#FFFFFF}', 'h'),
  ('TUR', 'Turquie',         '{#E30A17,#FFFFFF}', 'disc'),
  ('HUN', 'Hongrie',         '{#CE2939,#FFFFFF,#477050}', 'h');

-- -----------------------------------------------------------------------------
-- Clubs (écussons génériques générés à partir des couleurs)
-- -----------------------------------------------------------------------------
insert into public.clubs (code, name, short_name, city, nation_id, color_primary, color_secondary)
select c.code, c.name, c.short_name, c.city, n.id, c.p, c.s
from (values
  ('RMA',  'Real Madrid',            'RMA', 'Madrid',        'ESP', '#F4F4F4', '#3D195B'),
  ('FCB',  'FC Barcelone',           'FCB', 'Barcelone',     'ESP', '#A50044', '#004D98'),
  ('PSG',  'Paris Saint-Germain',    'PSG', 'Paris',         'FRA', '#004170', '#DA291C'),
  ('MCI',  'Manchester City',        'MCI', 'Manchester',    'ENG', '#6CABDD', '#1C2C5B'),
  ('LIV',  'Liverpool',              'LIV', 'Liverpool',     'ENG', '#C8102E', '#F6EB61'),
  ('ARS',  'Arsenal',                'ARS', 'Londres',       'ENG', '#EF0107', '#FFFFFF'),
  ('FCBY', 'Bayern Munich',          'BAY', 'Munich',        'GER', '#DC052D', '#0066B2'),
  ('INT',  'Inter Milan',            'INT', 'Milan',         'ITA', '#010E80', '#000000'),
  ('ACM',  'AC Milan',               'MIL', 'Milan',         'ITA', '#FB090B', '#000000'),
  ('JUV',  'Juventus',               'JUV', 'Turin',         'ITA', '#FFFFFF', '#000000'),
  ('ATM',  'Atlético de Madrid',     'ATM', 'Madrid',        'ESP', '#CB3524', '#272E61'),
  ('CHE',  'Chelsea',                'CHE', 'Londres',       'ENG', '#034694', '#FFFFFF'),
  ('MUN',  'Manchester United',      'MUN', 'Manchester',    'ENG', '#DA291C', '#FBE122'),
  ('NAP',  'Naples',                 'NAP', 'Naples',        'ITA', '#12A0D7', '#FFFFFF'),
  ('BVB',  'Borussia Dortmund',      'BVB', 'Dortmund',      'GER', '#FDE100', '#000000'),
  ('MIA',  'Inter Miami',            'MIA', 'Miami',         null,  '#F7B5CD', '#231F20'),
  ('NAS',  'Al-Nassr',               'NAS', 'Riyad',         null,  '#FFDD00', '#1E3A8A'),
  ('HIL',  'Al-Hilal',               'HIL', 'Riyad',         null,  '#005BAC', '#FFFFFF'),
  ('AHL',  'Al-Ahli',                'AHL', 'Djeddah',       null,  '#00843D', '#FFFFFF'),
  ('ITT',  'Al-Ittihad',             'ITT', 'Djeddah',       null,  '#FFD100', '#000000'),
  ('SAN',  'Santos',                 'SAN', 'Santos',        'BRA', '#FFFFFF', '#000000'),
  ('OM',   'Olympique de Marseille', 'OM',  'Marseille',     'FRA', '#2FAEE0', '#FFFFFF'),
  ('OL',   'Olympique Lyonnais',     'OL',  'Lyon',          'FRA', '#FFFFFF', '#DA001A'),
  ('ASM',  'AS Monaco',              'ASM', 'Monaco',        'FRA', '#E51B22', '#FFFFFF'),
  ('GAL',  'Galatasaray',            'GAL', 'Istanbul',      'TUR', '#A90432', '#FDB912'),
  ('LAFC', 'Los Angeles FC',         'LAF', 'Los Angeles',   null,  '#000000', '#C39E6D'),
  ('ATH',  'Athletic Bilbao',        'ATH', 'Bilbao',        'ESP', '#EE2523', '#FFFFFF'),
  ('RSO',  'Real Sociedad',          'RSO', 'Saint-Sébastien','ESP', '#0067B1', '#FFFFFF'),
  ('BHA',  'Brighton',               'BHA', 'Brighton',      'ENG', '#0057B8', '#FFFFFF'),
  ('CRY',  'Crystal Palace',         'CRY', 'Londres',       'ENG', '#1B458F', '#C4122E'),
  ('NEW',  'Newcastle',              'NEW', 'Newcastle',     'ENG', '#241F20', '#FFFFFF'),
  ('TOT',  'Tottenham',              'TOT', 'Londres',       'ENG', '#FFFFFF', '#132257'),
  ('ATA',  'Atalanta',               'ATA', 'Bergame',       'ITA', '#1E71B8', '#000000'),
  ('AJX',  'Ajax',                   'AJX', 'Amsterdam',     'NED', '#D2122E', '#FFFFFF'),
  ('BOC',  'Boca Juniors',           'BOC', 'Buenos Aires',  'ARG', '#103F79', '#F3B229'),
  ('BOR',  'Girondins de Bordeaux',  'BOR', 'Bordeaux',      'FRA', '#001C50', '#FFFFFF'),
  ('ASSE', 'AS Saint-Étienne',       'ASSE','Saint-Étienne', 'FRA', '#009A44', '#FFFFFF'),
  ('PSV',  'PSV Eindhoven',          'PSV', 'Eindhoven',     'NED', '#ED1C24', '#FFFFFF'),
  ('SAL',  'RB Salzbourg',           'SAL', 'Salzbourg',     null,  '#FFFFFF', '#D40F3A')
) as c(code, name, short_name, city, nation, p, s)
left join public.nations n on n.code = c.nation;

-- -----------------------------------------------------------------------------
-- Joueurs
-- -----------------------------------------------------------------------------
insert into public.players (slug, first_name, last_name, display_name, nation_id, position, birth_year, is_legend, bio)
select p.slug, p.first_name, p.last_name, p.display_name, n.id, p.pos::public.player_position, p.birth_year, p.legend, p.bio
from (values
  -- Têtes d'affiche
  ('mbappe', 'Kylian', 'Mbappé', 'Kylian Mbappé', 'FRA', 'ATT', 1998, false,
   'Attaquant ultra-rapide révélé à Monaco, star du PSG puis du Real Madrid. Champion du monde 2018.'),
  ('messi', 'Lionel', 'Messi', 'Lionel Messi', 'ARG', 'ATT', 1987, false,
   'Formé à La Masia, légende du FC Barcelone, passé par le PSG avant l''Inter Miami. Champion du monde 2022.'),
  ('cristiano-ronaldo', 'Cristiano', 'Ronaldo', 'Cristiano Ronaldo', 'POR', 'ATT', 1985, false,
   'Buteur insatiable de Manchester United, du Real Madrid et de la Juventus, aujourd''hui à Al-Nassr.'),
  ('neymar', 'Neymar', 'da Silva Santos Júnior', 'Neymar Jr', 'BRA', 'ATT', 1992, false,
   'Dribbleur virtuose passé par Santos, Barcelone, le PSG et Al-Hilal avant son retour à Santos.'),
  ('haaland', 'Erling', 'Haaland', 'Erling Haaland', 'NOR', 'ATT', 2000, false,
   'Avant-centre puissant révélé à Salzbourg et Dortmund, machine à buts de Manchester City.'),
  ('lamine-yamal', 'Lamine', 'Yamal', 'Lamine Yamal', 'ESP', 'ATT', 2007, false,
   'Ailier prodige formé au FC Barcelone, champion d''Europe avec l''Espagne à 17 ans.'),
  ('dembele', 'Ousmane', 'Dembélé', 'Ousmane Dembélé', 'FRA', 'ATT', 1997, false,
   'Ailier ambidextre passé par Rennes, Dortmund et Barcelone, leader offensif du PSG.'),
  ('vinicius-jr', 'Vinícius', 'Júnior', 'Vinícius Jr', 'BRA', 'ATT', 2000, false,
   'Ailier explosif arrivé de Flamengo, figure majeure du Real Madrid.'),
  ('zidane', 'Zinédine', 'Zidane', 'Zinédine Zidane', 'FRA', 'MIL', 1972, true,
   'Meneur de jeu de Bordeaux, de la Juventus et du Real Madrid. Champion du monde 1998.'),
  ('ronaldinho', 'Ronaldo', 'de Assis Moreira', 'Ronaldinho', 'BRA', 'MIL', 1980, true,
   'Magicien du PSG, du FC Barcelone et de l''AC Milan. Champion du monde 2002.'),
  -- Saison 2026
  ('bellingham', 'Jude', 'Bellingham', 'Jude Bellingham', 'ENG', 'MIL', 2003, false, null),
  ('kane', 'Harry', 'Kane', 'Harry Kane', 'ENG', 'ATT', 1993, false, null),
  ('salah', 'Mohamed', 'Salah', 'Mohamed Salah', 'EGY', 'ATT', 1992, false, null),
  ('de-bruyne', 'Kevin', 'De Bruyne', 'Kevin De Bruyne', 'BEL', 'MIL', 1991, false, null),
  ('rodri', 'Rodrigo', 'Hernández', 'Rodri', 'ESP', 'MIL', 1996, false, null),
  ('pedri', 'Pedro', 'González', 'Pedri', 'ESP', 'MIL', 2002, false, null),
  ('lewandowski', 'Robert', 'Lewandowski', 'Robert Lewandowski', 'POL', 'ATT', 1988, false, null),
  ('saka', 'Bukayo', 'Saka', 'Bukayo Saka', 'ENG', 'ATT', 2001, false, null),
  ('musiala', 'Jamal', 'Musiala', 'Jamal Musiala', 'GER', 'MIL', 2003, false, null),
  ('wirtz', 'Florian', 'Wirtz', 'Florian Wirtz', 'GER', 'MIL', 2003, false, null),
  ('van-dijk', 'Virgil', 'van Dijk', 'Virgil van Dijk', 'NED', 'DEF', 1991, false, null),
  ('modric', 'Luka', 'Modrić', 'Luka Modrić', 'CRO', 'MIL', 1985, false, null),
  ('courtois', 'Thibaut', 'Courtois', 'Thibaut Courtois', 'BEL', 'GB', 1992, false, null),
  ('alisson', 'Alisson', 'Becker', 'Alisson', 'BRA', 'GB', 1992, false, null),
  ('donnarumma', 'Gianluigi', 'Donnarumma', 'Gianluigi Donnarumma', 'ITA', 'GB', 1999, false, null),
  ('maignan', 'Mike', 'Maignan', 'Mike Maignan', 'FRA', 'GB', 1995, false, null),
  ('saliba', 'William', 'Saliba', 'William Saliba', 'FRA', 'DEF', 2001, false, null),
  ('hakimi', 'Achraf', 'Hakimi', 'Achraf Hakimi', 'MAR', 'DEF', 1998, false, null),
  ('vitinha', 'Vítor', 'Ferreira', 'Vitinha', 'POR', 'MIL', 2000, false, null),
  ('kvaratskhelia', 'Khvicha', 'Kvaratskhelia', 'Khvicha Kvaratskhelia', 'GEO', 'ATT', 2001, false, null),
  ('doue', 'Désiré', 'Doué', 'Désiré Doué', 'FRA', 'ATT', 2005, false, null),
  ('marquinhos', 'Marcos', 'Aoás Corrêa', 'Marquinhos', 'BRA', 'DEF', 1994, false, null),
  ('griezmann', 'Antoine', 'Griezmann', 'Antoine Griezmann', 'FRA', 'ATT', 1991, false, null),
  ('tchouameni', 'Aurélien', 'Tchouaméni', 'Aurélien Tchouaméni', 'FRA', 'MIL', 2000, false, null),
  ('camavinga', 'Eduardo', 'Camavinga', 'Eduardo Camavinga', 'FRA', 'MIL', 2002, false, null),
  ('rudiger', 'Antonio', 'Rüdiger', 'Antonio Rüdiger', 'GER', 'DEF', 1993, false, null),
  ('valverde', 'Federico', 'Valverde', 'Federico Valverde', 'URU', 'MIL', 1998, false, null),
  ('lautaro-martinez', 'Lautaro', 'Martínez', 'Lautaro Martínez', 'ARG', 'ATT', 1997, false, null),
  ('barella', 'Nicolò', 'Barella', 'Nicolò Barella', 'ITA', 'MIL', 1997, false, null),
  ('marcus-thuram', 'Marcus', 'Thuram', 'Marcus Thuram', 'FRA', 'ATT', 1997, false, null),
  ('rafael-leao', 'Rafael', 'Leão', 'Rafael Leão', 'POR', 'ATT', 1999, false, null),
  ('osimhen', 'Victor', 'Osimhen', 'Victor Osimhen', 'NGA', 'ATT', 1998, false, null),
  ('son-heung-min', 'Heung-min', 'Son', 'Son Heung-min', 'KOR', 'ATT', 1992, false, null),
  ('foden', 'Phil', 'Foden', 'Phil Foden', 'ENG', 'MIL', 2000, false, null),
  ('raphinha', 'Raphael', 'Dias Belloli', 'Raphinha', 'BRA', 'ATT', 1996, false, null),
  ('olise', 'Michael', 'Olise', 'Michael Olise', 'FRA', 'ATT', 2001, false, null),
  ('kimmich', 'Joshua', 'Kimmich', 'Joshua Kimmich', 'GER', 'MIL', 1995, false, null),
  ('isak', 'Alexander', 'Isak', 'Alexander Isak', 'SWE', 'ATT', 1999, false, null),
  ('gyokeres', 'Viktor', 'Gyökeres', 'Viktor Gyökeres', 'SWE', 'ATT', 1998, false, null),
  ('rice', 'Declan', 'Rice', 'Declan Rice', 'ENG', 'MIL', 1999, false, null),
  ('bruno-fernandes', 'Bruno', 'Fernandes', 'Bruno Fernandes', 'POR', 'MIL', 1994, false, null),
  ('odegaard', 'Martin', 'Ødegaard', 'Martin Ødegaard', 'NOR', 'MIL', 1998, false, null),
  ('theo-hernandez', 'Theo', 'Hernández', 'Theo Hernández', 'FRA', 'DEF', 1997, false, null),
  ('kounde', 'Jules', 'Koundé', 'Jules Koundé', 'FRA', 'DEF', 1998, false, null),
  ('cubarsi', 'Pau', 'Cubarsí', 'Pau Cubarsí', 'ESP', 'DEF', 2007, false, null),
  ('gavi', 'Pablo', 'Páez Gavira', 'Gavi', 'ESP', 'MIL', 2004, false, null),
  ('nico-williams', 'Nico', 'Williams', 'Nico Williams', 'ESP', 'ATT', 2002, false, null),
  ('mac-allister', 'Alexis', 'Mac Allister', 'Alexis Mac Allister', 'ARG', 'MIL', 1998, false, null),
  ('enzo-fernandez', 'Enzo', 'Fernández', 'Enzo Fernández', 'ARG', 'MIL', 2001, false, null),
  ('cole-palmer', 'Cole', 'Palmer', 'Cole Palmer', 'ENG', 'MIL', 2002, false, null),
  ('julian-alvarez', 'Julián', 'Álvarez', 'Julián Álvarez', 'ARG', 'ATT', 2000, false, null),
  ('ter-stegen', 'Marc-André', 'ter Stegen', 'Marc-André ter Stegen', 'GER', 'GB', 1992, false, null),
  ('ruben-dias', 'Rúben', 'Dias', 'Rúben Dias', 'POR', 'DEF', 1997, false, null),
  ('gvardiol', 'Joško', 'Gvardiol', 'Joško Gvardiol', 'CRO', 'DEF', 2002, false, null),
  ('alphonso-davies', 'Alphonso', 'Davies', 'Alphonso Davies', 'CAN', 'DEF', 2000, false, null),
  ('luis-diaz', 'Luis', 'Díaz', 'Luis Díaz', 'COL', 'ATT', 1997, false, null),
  ('benzema', 'Karim', 'Benzema', 'Karim Benzema', 'FRA', 'ATT', 1987, false, null),
  ('barcola', 'Bradley', 'Barcola', 'Bradley Barcola', 'FRA', 'ATT', 2002, false, null),
  ('nuno-mendes', 'Nuno', 'Mendes', 'Nuno Mendes', 'POR', 'DEF', 2002, false, null),
  ('joao-neves', 'João', 'Neves', 'João Neves', 'POR', 'MIL', 2004, false, null),
  ('bastoni', 'Alessandro', 'Bastoni', 'Alessandro Bastoni', 'ITA', 'DEF', 1999, false, null),
  ('alexander-arnold', 'Trent', 'Alexander-Arnold', 'Trent Alexander-Arnold', 'ENG', 'DEF', 1998, false, null),
  ('kubo', 'Takefusa', 'Kubo', 'Takefusa Kubo', 'JPN', 'ATT', 2001, false, null),
  ('mitoma', 'Kaoru', 'Mitoma', 'Kaoru Mitoma', 'JPN', 'ATT', 1997, false, null),
  ('mahrez', 'Riyad', 'Mahrez', 'Riyad Mahrez', 'ALG', 'ATT', 1991, false, null),
  ('mane', 'Sadio', 'Mané', 'Sadio Mané', 'SEN', 'ATT', 1992, false, null),
  ('ismaila-sarr', 'Ismaïla', 'Sarr', 'Ismaïla Sarr', 'SEN', 'ATT', 1998, false, null),
  ('hojlund', 'Rasmus', 'Højlund', 'Rasmus Højlund', 'DEN', 'ATT', 2003, false, null),
  ('lukaku', 'Romelu', 'Lukaku', 'Romelu Lukaku', 'BEL', 'ATT', 1993, false, null),
  ('chevalier', 'Lucas', 'Chevalier', 'Lucas Chevalier', 'FRA', 'GB', 2001, false, null),
  ('zaire-emery', 'Warren', 'Zaïre-Emery', 'Warren Zaïre-Emery', 'FRA', 'MIL', 2006, false, null),
  ('aubameyang', 'Pierre-Emerick', 'Aubameyang', 'Pierre-Emerick Aubameyang', 'FRA', 'ATT', 1989, false, null),
  ('rulli', 'Gerónimo', 'Rulli', 'Gerónimo Rulli', 'ARG', 'GB', 1992, false, null),
  ('balerdi', 'Leonardo', 'Balerdi', 'Leonardo Balerdi', 'ARG', 'DEF', 1999, false, null),
  ('tolisso', 'Corentin', 'Tolisso', 'Corentin Tolisso', 'FRA', 'MIL', 1994, false, null),
  ('cherki', 'Rayan', 'Cherki', 'Rayan Cherki', 'FRA', 'MIL', 2003, false, null),
  ('lucas-hernandez', 'Lucas', 'Hernández', 'Lucas Hernández', 'FRA', 'DEF', 1996, false, null),
  ('konate', 'Ibrahima', 'Konaté', 'Ibrahima Konaté', 'FRA', 'DEF', 1999, false, null),
  ('upamecano', 'Dayot', 'Upamecano', 'Dayot Upamecano', 'FRA', 'DEF', 1998, false, null),
  ('nkunku', 'Christopher', 'Nkunku', 'Christopher Nkunku', 'FRA', 'ATT', 1997, false, null),
  ('coman', 'Kingsley', 'Coman', 'Kingsley Coman', 'FRA', 'ATT', 1996, false, null),
  ('rabiot', 'Adrien', 'Rabiot', 'Adrien Rabiot', 'FRA', 'MIL', 1995, false, null),
  ('balogun', 'Folarin', 'Balogun', 'Folarin Balogun', 'ENG', 'ATT', 2001, false, null),
  ('minamino', 'Takumi', 'Minamino', 'Takumi Minamino', 'JPN', 'MIL', 1995, false, null),
  ('jonathan-david', 'Jonathan', 'David', 'Jonathan David', 'CAN', 'ATT', 2000, false, null),
  ('vlahovic', 'Dušan', 'Vlahović', 'Dušan Vlahović', 'SRB', 'ATT', 2000, false, null),
  ('yildiz', 'Kenan', 'Yıldız', 'Kenan Yıldız', 'TUR', 'ATT', 2005, false, null),
  ('arda-guler', 'Arda', 'Güler', 'Arda Güler', 'TUR', 'MIL', 2005, false, null),
  ('huijsen', 'Dean', 'Huijsen', 'Dean Huijsen', 'ESP', 'DEF', 2005, false, null),
  ('zubimendi', 'Martín', 'Zubimendi', 'Martín Zubimendi', 'ESP', 'MIL', 1999, false, null),
  ('martinelli', 'Gabriel', 'Martinelli', 'Gabriel Martinelli', 'BRA', 'ATT', 2001, false, null),
  ('szoboszlai', 'Dominik', 'Szoboszlai', 'Dominik Szoboszlai', 'HUN', 'MIL', 2000, false, null),
  ('gakpo', 'Cody', 'Gakpo', 'Cody Gakpo', 'NED', 'ATT', 1999, false, null),
  ('gravenberch', 'Ryan', 'Gravenberch', 'Ryan Gravenberch', 'NED', 'MIL', 2002, false, null),
  ('frenkie-de-jong', 'Frenkie', 'de Jong', 'Frenkie de Jong', 'NED', 'MIL', 1997, false, null),
  ('fermin-lopez', 'Fermín', 'López', 'Fermín López', 'ESP', 'MIL', 2003, false, null),
  ('dani-olmo', 'Dani', 'Olmo', 'Dani Olmo', 'ESP', 'MIL', 1998, false, null),
  ('balde', 'Alejandro', 'Balde', 'Alejandro Balde', 'ESP', 'DEF', 2003, false, null),
  ('gnabry', 'Serge', 'Gnabry', 'Serge Gnabry', 'GER', 'ATT', 1995, false, null),
  ('havertz', 'Kai', 'Havertz', 'Kai Havertz', 'GER', 'ATT', 1999, false, null),
  ('tonali', 'Sandro', 'Tonali', 'Sandro Tonali', 'ITA', 'MIL', 2000, false, null),
  ('dimarco', 'Federico', 'Dimarco', 'Federico Dimarco', 'ITA', 'DEF', 1997, false, null),
  ('bruno-guimaraes', 'Bruno', 'Guimarães', 'Bruno Guimarães', 'BRA', 'MIL', 1997, false, null),
  ('bernardo-silva', 'Bernardo', 'Silva', 'Bernardo Silva', 'POR', 'MIL', 1994, false, null),
  ('brahim-diaz', 'Brahim', 'Díaz', 'Brahim Díaz', 'MAR', 'MIL', 1999, false, null),
  ('bounou', 'Yassine', 'Bounou', 'Yassine Bounou', 'MAR', 'GB', 1991, false, null),
  ('lookman', 'Ademola', 'Lookman', 'Ademola Lookman', 'NGA', 'ATT', 1997, false, null),
  ('marmoush', 'Omar', 'Marmoush', 'Omar Marmoush', 'EGY', 'ATT', 1999, false, null),
  ('kim-min-jae', 'Min-jae', 'Kim', 'Kim Min-jae', 'KOR', 'DEF', 1996, false, null),
  ('lee-kang-in', 'Kang-in', 'Lee', 'Lee Kang-in', 'KOR', 'MIL', 2001, false, null),
  ('gouiri', 'Amine', 'Gouiri', 'Amine Gouiri', 'ALG', 'ATT', 2000, false, null),
  ('kessie', 'Franck', 'Kessié', 'Franck Kessié', 'CIV', 'MIL', 1996, false, null),
  ('hojbjerg', 'Pierre-Emile', 'Højbjerg', 'Pierre-Emile Højbjerg', 'DEN', 'MIL', 1995, false, null),
  ('kulusevski', 'Dejan', 'Kulusevski', 'Dejan Kulusevski', 'SWE', 'ATT', 2000, false, null),
  ('sorloth', 'Alexander', 'Sørloth', 'Alexander Sørloth', 'NOR', 'ATT', 1995, false, null),
  -- Légendes
  ('henry', 'Thierry', 'Henry', 'Thierry Henry', 'FRA', 'ATT', 1977, true,
   'Attaquant élégant de Monaco, d''Arsenal et du FC Barcelone. Champion du monde 1998.'),
  ('platini', 'Michel', 'Platini', 'Michel Platini', 'FRA', 'MIL', 1955, true,
   'Meneur de Nancy, de Saint-Étienne et de la Juventus, triple Ballon d''Or.'),
  ('maradona', 'Diego', 'Maradona', 'Diego Maradona', 'ARG', 'MIL', 1960, true,
   'Génie de Boca Juniors, du FC Barcelone et de Naples. Champion du monde 1986.'),
  ('pele', 'Edson', 'Arantes do Nascimento', 'Pelé', 'BRA', 'ATT', 1940, true,
   'Le « Roi », icône de Santos et triple champion du monde avec le Brésil.'),
  ('cruyff', 'Johan', 'Cruyff', 'Johan Cruyff', 'NED', 'ATT', 1947, true,
   'Inspirateur du football total à l''Ajax et au FC Barcelone, triple Ballon d''Or.'),
  ('beckenbauer', 'Franz', 'Beckenbauer', 'Franz Beckenbauer', 'GER', 'DEF', 1945, true,
   'Le « Kaiser », libéro du Bayern Munich, champion du monde comme joueur et comme sélectionneur.'),
  ('ronaldo-nazario', 'Ronaldo', 'Nazário', 'Ronaldo Nazário', 'BRA', 'ATT', 1976, true,
   'Le « Phénomène » du PSV, du Barça, de l''Inter et du Real Madrid. Double champion du monde.'),
  ('kaka', 'Ricardo', 'Izecson dos Santos Leite', 'Kaká', 'BRA', 'MIL', 1982, true,
   'Milieu offensif de São Paulo, de l''AC Milan et du Real Madrid, Ballon d''Or 2007.'),
  ('pirlo', 'Andrea', 'Pirlo', 'Andrea Pirlo', 'ITA', 'MIL', 1979, true,
   'Architecte du jeu de l''AC Milan et de la Juventus. Champion du monde 2006.'),
  ('maldini', 'Paolo', 'Maldini', 'Paolo Maldini', 'ITA', 'DEF', 1968, true,
   'Défenseur d''un seul club, l''AC Milan, pendant un quart de siècle.'),
  ('buffon', 'Gianluigi', 'Buffon', 'Gianluigi Buffon', 'ITA', 'GB', 1978, true,
   'Gardien de Parme, de la Juventus et du PSG. Champion du monde 2006.'),
  ('iniesta', 'Andrés', 'Iniesta', 'Andrés Iniesta', 'ESP', 'MIL', 1984, true,
   'Milieu formé au FC Barcelone, buteur en finale de la Coupe du monde 2010.'),
  ('xavi', 'Xavier', 'Hernández', 'Xavi', 'ESP', 'MIL', 1980, true,
   'Métronome du FC Barcelone et de l''Espagne championne du monde 2010.'),
  ('casillas', 'Iker', 'Casillas', 'Iker Casillas', 'ESP', 'GB', 1981, true,
   'Gardien et capitaine du Real Madrid et de l''Espagne championne du monde 2010.'),
  ('drogba', 'Didier', 'Drogba', 'Didier Drogba', 'CIV', 'ATT', 1978, true,
   'Avant-centre de l''OM et de Chelsea, héros de la finale européenne 2012.'),
  ('papin', 'Jean-Pierre', 'Papin', 'Jean-Pierre Papin', 'FRA', 'ATT', 1963, true,
   'Roi des « papinades » à l''OM, Ballon d''Or 1991.'),
  ('cantona', 'Éric', 'Cantona', 'Éric Cantona', 'FRA', 'ATT', 1966, true,
   'Le « King » de Manchester United, au col relevé.'),
  ('ribery', 'Franck', 'Ribéry', 'Franck Ribéry', 'FRA', 'ATT', 1983, true,
   'Ailier virevoltant de l''OM et du Bayern Munich.'),
  ('gerrard', 'Steven', 'Gerrard', 'Steven Gerrard', 'ENG', 'MIL', 1980, true,
   'Capitaine emblématique de Liverpool, héros d''Istanbul 2005.'),
  ('rooney', 'Wayne', 'Rooney', 'Wayne Rooney', 'ENG', 'ATT', 1985, true,
   'Meilleur buteur de l''histoire de Manchester United.'),
  ('etoo', 'Samuel', 'Eto''o', 'Samuel Eto''o', 'CMR', 'ATT', 1981, true,
   'Buteur du FC Barcelone et de l''Inter, quadruple Ballon d''Or africain.'),
  ('puyol', 'Carles', 'Puyol', 'Carles Puyol', 'ESP', 'DEF', 1978, true,
   'Capitaine-courage du FC Barcelone, champion du monde 2010.')
) as p(slug, first_name, last_name, display_name, nation, pos, birth_year, legend, bio)
join public.nations n on n.code = p.nation;

-- -----------------------------------------------------------------------------
-- Modèles de cartes (numérotés par rareté puis note)
-- -----------------------------------------------------------------------------
create temporary table tmp_templates (slug text, club text, season text, edition text, rarity public.rarity, rating int);

insert into tmp_templates values
  -- Têtes d'affiche
  ('mbappe', 'RMA', 'Saison 2026', 'Base', 'legendaire', 91),
  ('mbappe', 'RMA', 'Saison 2026', 'Coupe des Étoiles', 'iconique', 93),
  ('mbappe', 'PSG', 'Rétro', 'Les années Paris', 'epique', 89),
  ('mbappe', 'RMA', 'Saison 2026', 'Holo', 'speciale', 95),
  ('messi', 'MIA', 'Saison 2026', 'Base', 'legendaire', 88),
  ('messi', 'FCB', 'Légende', 'Légende', 'iconique', 97),
  ('messi', 'FCB', 'Légende', 'Holo', 'speciale', 98),
  ('cristiano-ronaldo', 'NAS', 'Saison 2026', 'Base', 'epique', 86),
  ('cristiano-ronaldo', 'RMA', 'Légende', 'Légende', 'iconique', 96),
  ('neymar', 'SAN', 'Saison 2026', 'Base', 'rare', 82),
  ('neymar', 'FCB', 'Rétro', 'Les années Barça', 'legendaire', 91),
  ('haaland', 'MCI', 'Saison 2026', 'Base', 'legendaire', 91),
  ('haaland', 'MCI', 'Saison 2026', 'Coupe des Étoiles', 'iconique', 93),
  ('lamine-yamal', 'FCB', 'Saison 2026', 'Base', 'legendaire', 89),
  ('lamine-yamal', 'FCB', 'Saison 2026', 'Étoile montante', 'speciale', 92),
  ('dembele', 'PSG', 'Saison 2026', 'Base', 'legendaire', 90),
  ('dembele', 'PSG', 'Saison 2026', 'Coupe des Étoiles', 'iconique', 92),
  ('vinicius-jr', 'RMA', 'Saison 2026', 'Base', 'legendaire', 89),
  ('vinicius-jr', 'RMA', 'Saison 2026', 'Coupe des Étoiles', 'epique', 90),
  ('zidane', 'RMA', 'Légende', 'Légende', 'iconique', 96),
  ('zidane', 'JUV', 'Légende', 'Holo', 'speciale', 97),
  ('ronaldinho', 'FCB', 'Légende', 'Légende', 'iconique', 95),
  ('ronaldinho', 'PSG', 'Légende', 'Rétro', 'legendaire', 92),
  -- Saison 2026 — Épiques
  ('bellingham', 'RMA', 'Saison 2026', 'Base', 'epique', 89),
  ('bellingham', 'RMA', 'Saison 2026', 'Coupe des Étoiles', 'legendaire', 90),
  ('kane', 'FCBY', 'Saison 2026', 'Base', 'epique', 89),
  ('salah', 'LIV', 'Saison 2026', 'Base', 'epique', 88),
  ('de-bruyne', 'NAP', 'Saison 2026', 'Base', 'epique', 86),
  ('rodri', 'MCI', 'Saison 2026', 'Base', 'epique', 88),
  ('pedri', 'FCB', 'Saison 2026', 'Base', 'epique', 88),
  ('saka', 'ARS', 'Saison 2026', 'Base', 'epique', 87),
  ('musiala', 'FCBY', 'Saison 2026', 'Base', 'epique', 87),
  ('wirtz', 'LIV', 'Saison 2026', 'Base', 'epique', 87),
  ('van-dijk', 'LIV', 'Saison 2026', 'Base', 'epique', 88),
  ('courtois', 'RMA', 'Saison 2026', 'Base', 'epique', 88),
  ('donnarumma', 'MCI', 'Saison 2026', 'Base', 'epique', 87),
  ('saliba', 'ARS', 'Saison 2026', 'Base', 'epique', 87),
  ('hakimi', 'PSG', 'Saison 2026', 'Base', 'epique', 87),
  ('vitinha', 'PSG', 'Saison 2026', 'Base', 'epique', 88),
  ('vitinha', 'PSG', 'Saison 2026', 'Coupe des Étoiles', 'legendaire', 89),
  ('kvaratskhelia', 'PSG', 'Saison 2026', 'Base', 'epique', 87),
  ('valverde', 'RMA', 'Saison 2026', 'Base', 'epique', 87),
  ('lautaro-martinez', 'INT', 'Saison 2026', 'Base', 'epique', 88),
  ('raphinha', 'FCB', 'Saison 2026', 'Base', 'epique', 88),
  ('olise', 'FCBY', 'Saison 2026', 'Base', 'epique', 87),
  ('kimmich', 'FCBY', 'Saison 2026', 'Base', 'epique', 87),
  ('isak', 'LIV', 'Saison 2026', 'Base', 'epique', 87),
  ('cole-palmer', 'CHE', 'Saison 2026', 'Base', 'epique', 87),
  ('julian-alvarez', 'ATM', 'Saison 2026', 'Base', 'epique', 87),
  ('cubarsi', 'FCB', 'Saison 2026', 'Étoile montante', 'epique', 85),
  ('doue', 'PSG', 'Saison 2026', 'Étoile montante', 'legendaire', 88),
  ('benzema', 'RMA', 'Rétro', 'Les années Madrid', 'legendaire', 91),
  -- Saison 2026 — Rares
  ('lewandowski', 'FCB', 'Saison 2026', 'Base', 'rare', 85),
  ('modric', 'ACM', 'Saison 2026', 'Base', 'rare', 84),
  ('alisson', 'LIV', 'Saison 2026', 'Base', 'rare', 86),
  ('maignan', 'ACM', 'Saison 2026', 'Base', 'rare', 85),
  ('doue', 'PSG', 'Saison 2026', 'Base', 'rare', 85),
  ('marquinhos', 'PSG', 'Saison 2026', 'Base', 'rare', 85),
  ('griezmann', 'ATM', 'Saison 2026', 'Base', 'rare', 85),
  ('tchouameni', 'RMA', 'Saison 2026', 'Base', 'rare', 84),
  ('camavinga', 'RMA', 'Saison 2026', 'Base', 'rare', 83),
  ('rudiger', 'RMA', 'Saison 2026', 'Base', 'rare', 84),
  ('barella', 'INT', 'Saison 2026', 'Base', 'rare', 86),
  ('marcus-thuram', 'INT', 'Saison 2026', 'Base', 'rare', 84),
  ('rafael-leao', 'ACM', 'Saison 2026', 'Base', 'rare', 85),
  ('osimhen', 'GAL', 'Saison 2026', 'Base', 'rare', 85),
  ('son-heung-min', 'LAFC', 'Saison 2026', 'Base', 'rare', 84),
  ('foden', 'MCI', 'Saison 2026', 'Base', 'rare', 85),
  ('gyokeres', 'ARS', 'Saison 2026', 'Base', 'rare', 86),
  ('rice', 'ARS', 'Saison 2026', 'Base', 'rare', 86),
  ('bruno-fernandes', 'MUN', 'Saison 2026', 'Base', 'rare', 86),
  ('odegaard', 'ARS', 'Saison 2026', 'Base', 'rare', 86),
  ('theo-hernandez', 'HIL', 'Saison 2026', 'Base', 'rare', 83),
  ('kounde', 'FCB', 'Saison 2026', 'Base', 'rare', 84),
  ('cubarsi', 'FCB', 'Saison 2026', 'Base', 'rare', 83),
  ('gavi', 'FCB', 'Saison 2026', 'Base', 'rare', 82),
  ('nico-williams', 'ATH', 'Saison 2026', 'Base', 'rare', 84),
  ('mac-allister', 'LIV', 'Saison 2026', 'Base', 'rare', 86),
  ('enzo-fernandez', 'CHE', 'Saison 2026', 'Base', 'rare', 84),
  ('ter-stegen', 'FCB', 'Saison 2026', 'Base', 'rare', 84),
  ('ruben-dias', 'MCI', 'Saison 2026', 'Base', 'rare', 86),
  ('gvardiol', 'MCI', 'Saison 2026', 'Base', 'rare', 85),
  ('alphonso-davies', 'FCBY', 'Saison 2026', 'Base', 'rare', 83),
  ('luis-diaz', 'FCBY', 'Saison 2026', 'Base', 'rare', 85),
  ('benzema', 'ITT', 'Saison 2026', 'Base', 'rare', 84),
  ('barcola', 'PSG', 'Saison 2026', 'Base', 'rare', 84),
  ('nuno-mendes', 'PSG', 'Saison 2026', 'Base', 'rare', 86),
  ('joao-neves', 'PSG', 'Saison 2026', 'Base', 'rare', 86),
  ('bastoni', 'INT', 'Saison 2026', 'Base', 'rare', 85),
  ('alexander-arnold', 'RMA', 'Saison 2026', 'Base', 'rare', 84),
  -- Saison 2026 — Communes
  ('kubo', 'RSO', 'Saison 2026', 'Base', 'commune', 79),
  ('mitoma', 'BHA', 'Saison 2026', 'Base', 'commune', 79),
  ('mahrez', 'AHL', 'Saison 2026', 'Base', 'commune', 80),
  ('mane', 'NAS', 'Saison 2026', 'Base', 'commune', 80),
  ('ismaila-sarr', 'CRY', 'Saison 2026', 'Base', 'commune', 78),
  ('hojlund', 'NAP', 'Saison 2026', 'Base', 'commune', 78),
  ('lukaku', 'NAP', 'Saison 2026', 'Base', 'commune', 80),
  ('chevalier', 'PSG', 'Saison 2026', 'Base', 'commune', 80),
  ('zaire-emery', 'PSG', 'Saison 2026', 'Base', 'commune', 79),
  ('aubameyang', 'OM', 'Saison 2026', 'Base', 'commune', 78),
  ('rulli', 'OM', 'Saison 2026', 'Base', 'commune', 79),
  ('balerdi', 'OM', 'Saison 2026', 'Base', 'commune', 78),
  ('tolisso', 'OL', 'Saison 2026', 'Base', 'commune', 77),
  ('cherki', 'MCI', 'Saison 2026', 'Base', 'commune', 81),
  ('lucas-hernandez', 'PSG', 'Saison 2026', 'Base', 'commune', 80),
  ('konate', 'LIV', 'Saison 2026', 'Base', 'commune', 81),
  ('upamecano', 'FCBY', 'Saison 2026', 'Base', 'commune', 82),
  ('nkunku', 'ACM', 'Saison 2026', 'Base', 'commune', 80),
  ('coman', 'NAS', 'Saison 2026', 'Base', 'commune', 80),
  ('rabiot', 'ACM', 'Saison 2026', 'Base', 'commune', 80),
  ('balogun', 'ASM', 'Saison 2026', 'Base', 'commune', 77),
  ('minamino', 'ASM', 'Saison 2026', 'Base', 'commune', 77),
  ('jonathan-david', 'JUV', 'Saison 2026', 'Base', 'commune', 81),
  ('vlahovic', 'JUV', 'Saison 2026', 'Base', 'commune', 80),
  ('yildiz', 'JUV', 'Saison 2026', 'Base', 'commune', 81),
  ('arda-guler', 'RMA', 'Saison 2026', 'Base', 'commune', 80),
  ('huijsen', 'RMA', 'Saison 2026', 'Base', 'commune', 80),
  ('zubimendi', 'ARS', 'Saison 2026', 'Base', 'commune', 82),
  ('martinelli', 'ARS', 'Saison 2026', 'Base', 'commune', 81),
  ('szoboszlai', 'LIV', 'Saison 2026', 'Base', 'commune', 82),
  ('gakpo', 'LIV', 'Saison 2026', 'Base', 'commune', 82),
  ('gravenberch', 'LIV', 'Saison 2026', 'Base', 'commune', 82),
  ('frenkie-de-jong', 'FCB', 'Saison 2026', 'Base', 'commune', 82),
  ('fermin-lopez', 'FCB', 'Saison 2026', 'Base', 'commune', 79),
  ('dani-olmo', 'FCB', 'Saison 2026', 'Base', 'commune', 82),
  ('balde', 'FCB', 'Saison 2026', 'Base', 'commune', 80),
  ('gnabry', 'FCBY', 'Saison 2026', 'Base', 'commune', 79),
  ('havertz', 'ARS', 'Saison 2026', 'Base', 'commune', 81),
  ('tonali', 'NEW', 'Saison 2026', 'Base', 'commune', 82),
  ('dimarco', 'INT', 'Saison 2026', 'Base', 'commune', 82),
  ('bruno-guimaraes', 'NEW', 'Saison 2026', 'Base', 'commune', 82),
  ('bernardo-silva', 'MCI', 'Saison 2026', 'Base', 'commune', 82),
  ('brahim-diaz', 'RMA', 'Saison 2026', 'Base', 'commune', 80),
  ('bounou', 'HIL', 'Saison 2026', 'Base', 'commune', 81),
  ('lookman', 'ATA', 'Saison 2026', 'Base', 'commune', 81),
  ('marmoush', 'MCI', 'Saison 2026', 'Base', 'commune', 81),
  ('kim-min-jae', 'FCBY', 'Saison 2026', 'Base', 'commune', 81),
  ('lee-kang-in', 'PSG', 'Saison 2026', 'Base', 'commune', 79),
  ('gouiri', 'OM', 'Saison 2026', 'Base', 'commune', 79),
  ('kessie', 'AHL', 'Saison 2026', 'Base', 'commune', 78),
  ('hojbjerg', 'OM', 'Saison 2026', 'Base', 'commune', 78),
  ('kulusevski', 'TOT', 'Saison 2026', 'Base', 'commune', 80),
  ('sorloth', 'ATM', 'Saison 2026', 'Base', 'commune', 78),
  ('griezmann', 'ATM', 'Saison 2026', 'Coupe des Étoiles', 'commune', 76),
  ('osimhen', 'GAL', 'Saison 2026', 'Coupe des Étoiles', 'commune', 76),
  ('son-heung-min', 'LAFC', 'Saison 2026', 'Coupe des Étoiles', 'commune', 75),
  -- Légendes
  ('henry', 'ARS', 'Légende', 'Légende', 'iconique', 94),
  ('platini', 'JUV', 'Légende', 'Légende', 'legendaire', 93),
  ('maradona', 'NAP', 'Légende', 'Légende', 'iconique', 97),
  ('pele', 'SAN', 'Légende', 'Légende', 'iconique', 98),
  ('pele', 'SAN', 'Légende', 'Holo', 'speciale', 99),
  ('cruyff', 'AJX', 'Légende', 'Légende', 'iconique', 95),
  ('beckenbauer', 'FCBY', 'Légende', 'Légende', 'legendaire', 94),
  ('ronaldo-nazario', 'INT', 'Légende', 'Légende', 'iconique', 96),
  ('ronaldo-nazario', 'FCB', 'Légende', 'Holo', 'speciale', 97),
  ('kaka', 'ACM', 'Légende', 'Légende', 'legendaire', 92),
  ('pirlo', 'JUV', 'Légende', 'Légende', 'legendaire', 91),
  ('maldini', 'ACM', 'Légende', 'Légende', 'legendaire', 94),
  ('buffon', 'JUV', 'Légende', 'Légende', 'legendaire', 92),
  ('iniesta', 'FCB', 'Légende', 'Légende', 'legendaire', 93),
  ('xavi', 'FCB', 'Légende', 'Légende', 'legendaire', 92),
  ('casillas', 'RMA', 'Légende', 'Légende', 'legendaire', 91),
  ('drogba', 'CHE', 'Légende', 'Légende', 'legendaire', 91),
  ('papin', 'OM', 'Légende', 'Légende', 'legendaire', 90),
  ('cantona', 'MUN', 'Légende', 'Légende', 'legendaire', 91),
  ('ribery', 'FCBY', 'Légende', 'Légende', 'epique', 89),
  ('gerrard', 'LIV', 'Légende', 'Légende', 'legendaire', 91),
  ('rooney', 'MUN', 'Légende', 'Légende', 'epique', 89),
  ('etoo', 'FCB', 'Légende', 'Légende', 'legendaire', 91),
  ('puyol', 'FCB', 'Légende', 'Légende', 'epique', 88);

insert into public.card_templates (player_id, club_id, season, edition, rarity, rating, collection_number, max_supply)
select p.id, c.id, t.season, t.edition, t.rarity, t.rating,
       row_number() over (order by public.rarity_rank(t.rarity), t.rating desc, p.last_name),
       case t.rarity when 'legendaire' then 100 when 'iconique' then 50 when 'speciale' then 20 else null end
from tmp_templates t
join public.players p on p.slug = t.slug
join public.clubs c on c.code = t.club;

-- Parcours en club : club(s) des cartes + historique des têtes d'affiche / légendes
insert into public.player_clubs (player_id, club_id)
select distinct ct.player_id, ct.club_id from public.card_templates ct
on conflict do nothing;

insert into public.player_clubs (player_id, club_id, start_year, end_year)
select p.id, c.id, h.s, h.e
from (values
  ('mbappe', 'ASM', 2015, 2017), ('mbappe', 'PSG', 2017, 2024), ('mbappe', 'RMA', 2024, null),
  ('messi', 'FCB', 2004, 2021), ('messi', 'PSG', 2021, 2023), ('messi', 'MIA', 2023, null),
  ('cristiano-ronaldo', 'MUN', 2003, 2009), ('cristiano-ronaldo', 'RMA', 2009, 2018),
  ('cristiano-ronaldo', 'JUV', 2018, 2021), ('cristiano-ronaldo', 'NAS', 2023, null),
  ('neymar', 'SAN', 2009, 2013), ('neymar', 'FCB', 2013, 2017), ('neymar', 'PSG', 2017, 2023), ('neymar', 'HIL', 2023, 2025),
  ('haaland', 'SAL', 2019, 2020), ('haaland', 'BVB', 2020, 2022), ('haaland', 'MCI', 2022, null),
  ('lamine-yamal', 'FCB', 2023, null),
  ('dembele', 'BVB', 2016, 2017), ('dembele', 'FCB', 2017, 2023), ('dembele', 'PSG', 2023, null),
  ('vinicius-jr', 'RMA', 2018, null),
  ('zidane', 'BOR', 1992, 1996), ('zidane', 'JUV', 1996, 2001), ('zidane', 'RMA', 2001, 2006),
  ('ronaldinho', 'PSG', 2001, 2003), ('ronaldinho', 'FCB', 2003, 2008), ('ronaldinho', 'ACM', 2008, 2010),
  ('henry', 'ASM', 1994, 1999), ('henry', 'JUV', 1999, 1999), ('henry', 'ARS', 1999, 2007), ('henry', 'FCB', 2007, 2010),
  ('platini', 'ASSE', 1979, 1982), ('platini', 'JUV', 1982, 1987),
  ('maradona', 'BOC', 1981, 1982), ('maradona', 'FCB', 1982, 1984), ('maradona', 'NAP', 1984, 1991),
  ('cruyff', 'AJX', 1964, 1973), ('cruyff', 'FCB', 1973, 1978),
  ('ronaldo-nazario', 'PSV', 1994, 1996), ('ronaldo-nazario', 'FCB', 1996, 1997),
  ('ronaldo-nazario', 'INT', 1997, 2002), ('ronaldo-nazario', 'RMA', 2002, 2007),
  ('kaka', 'ACM', 2003, 2009), ('kaka', 'RMA', 2009, 2013),
  ('buffon', 'JUV', 2001, 2023), ('buffon', 'PSG', 2018, 2019),
  ('drogba', 'OM', 2003, 2004), ('drogba', 'CHE', 2004, 2012),
  ('papin', 'OM', 1986, 1992), ('papin', 'ACM', 1992, 1994),
  ('ribery', 'OM', 2005, 2007), ('ribery', 'FCBY', 2007, 2019),
  ('benzema', 'OL', 2005, 2009), ('benzema', 'RMA', 2009, 2023), ('benzema', 'ITT', 2023, null),
  ('etoo', 'FCB', 2004, 2009), ('etoo', 'INT', 2009, 2011)
) as h(slug, club, s, e)
join public.players p on p.slug = h.slug
join public.clubs c on c.code = h.club
on conflict (player_id, club_id) do update set start_year = excluded.start_year, end_year = excluded.end_year;

-- -----------------------------------------------------------------------------
-- Boosters
-- -----------------------------------------------------------------------------
insert into public.boosters (slug, name, description, kind, price, cards_count, guarantee_rarity, guarantee_count,
                             starts_at, ends_at, stock_total, stock_remaining, sort_order)
values
  ('gratuit', 'Booster du vestiaire', 'Trois cartes offertes à intervalles réguliers. Repasse au vestiaire !',
   'free', 0, 3, null, 0, null, null, null, null, 1),
  ('standard', 'Booster Tribune', 'Cinq cartes, dont au moins une Rare.',
   'standard', 200, 5, 'rare', 1, null, null, null, null, 2),
  ('premium', 'Booster Loge', 'Six cartes, dont au moins une Épique. Les grandes affiches.',
   'premium', 650, 6, 'epique', 1, null, null, null, null, 3),
  ('nuit-des-etoiles', 'Nuit des Étoiles', 'Édition événementielle : cotes renforcées sur les hautes raretés.',
   'event', 450, 5, 'rare', 2, now() - interval '3 days', now() + interval '18 days', null, null, 4),
  ('coupe-des-etoiles', 'Coupe des Étoiles', 'Tirage limité : les cartes de la Coupe des Étoiles, tant qu''il en reste.',
   'limited', 900, 5, 'epique', 1, null, null, 500, 500, 5);

insert into public.booster_odds (booster_id, rarity, probability)
select b.id, o.rarity::public.rarity, o.p
from (values
  ('gratuit', 'commune', 72.00), ('gratuit', 'rare', 21.00), ('gratuit', 'epique', 5.50),
  ('gratuit', 'legendaire', 1.20), ('gratuit', 'iconique', 0.25), ('gratuit', 'speciale', 0.05),
  ('standard', 'commune', 62.00), ('standard', 'rare', 26.00), ('standard', 'epique', 9.00),
  ('standard', 'legendaire', 2.30), ('standard', 'iconique', 0.60), ('standard', 'speciale', 0.10),
  ('premium', 'commune', 40.00), ('premium', 'rare', 33.00), ('premium', 'epique', 18.00),
  ('premium', 'legendaire', 6.50), ('premium', 'iconique', 2.00), ('premium', 'speciale', 0.50),
  ('nuit-des-etoiles', 'commune', 45.00), ('nuit-des-etoiles', 'rare', 30.00), ('nuit-des-etoiles', 'epique', 15.00),
  ('nuit-des-etoiles', 'legendaire', 7.00), ('nuit-des-etoiles', 'iconique', 2.50), ('nuit-des-etoiles', 'speciale', 0.50),
  ('coupe-des-etoiles', 'commune', 35.00), ('coupe-des-etoiles', 'rare', 30.00), ('coupe-des-etoiles', 'epique', 20.00),
  ('coupe-des-etoiles', 'legendaire', 10.00), ('coupe-des-etoiles', 'iconique', 4.00), ('coupe-des-etoiles', 'speciale', 1.00)
) as o(slug, rarity, p)
join public.boosters b on b.slug = o.slug;

-- Pool du booster « Coupe des Étoiles » : éditions Coupe des Étoiles + Saison 2026
insert into public.booster_cards (booster_id, template_id)
select b.id, ct.id
from public.boosters b
cross join public.card_templates ct
where b.slug = 'coupe-des-etoiles' and ct.season = 'Saison 2026';

-- -----------------------------------------------------------------------------
-- Albums
-- -----------------------------------------------------------------------------
insert into public.albums (slug, name, description, kind, reward_coins, sort_order) values
  ('coupe-des-etoiles', 'Coupe des Étoiles', 'Toutes les cartes de la compétition des étoiles.', 'competition', 1500, 1),
  ('paris-saint-germain', 'Paris Saint-Germain', 'L''effectif parisien de la saison.', 'club', 800, 2),
  ('real-madrid', 'Real Madrid', 'L''effectif madrilène de la saison.', 'club', 800, 3),
  ('equipe-de-france', 'Équipe de France', 'Les Bleus de la saison 2026.', 'nation', 1000, 4),
  ('saison-2026', 'Saison 2026', 'Toutes les cartes de base de la saison.', 'season', 5000, 5),
  ('legendes', 'Légendes', 'Ceux qui ont écrit l''histoire du jeu.', 'legends', 3000, 6);

insert into public.album_slots (album_id, slot_number, template_id)
select a.id, row_number() over (partition by a.id order by ct.collection_number), ct.id
from public.albums a
join public.card_templates ct on (
  (a.slug = 'coupe-des-etoiles' and ct.edition = 'Coupe des Étoiles') or
  (a.slug = 'paris-saint-germain' and ct.season = 'Saison 2026' and ct.club_id = (select id from public.clubs where code = 'PSG')) or
  (a.slug = 'real-madrid' and ct.season = 'Saison 2026' and ct.club_id = (select id from public.clubs where code = 'RMA')) or
  (a.slug = 'equipe-de-france' and ct.season = 'Saison 2026' and ct.edition = 'Base'
     and ct.player_id in (select id from public.players where nation_id = (select id from public.nations where code = 'FRA'))) or
  (a.slug = 'saison-2026' and ct.season = 'Saison 2026' and ct.edition = 'Base') or
  (a.slug = 'legendes' and ct.season = 'Légende')
);

-- -----------------------------------------------------------------------------
-- Comptes de démonstration (mot de passe commun : « petitpont »)
-- Le trigger handle_new_user crée le profil et crédite le solde de départ.
-- -----------------------------------------------------------------------------
do $$
declare
  d record;
begin
  for d in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'joueur.a@petitpont.test', 'Panenka'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'joueur.b@petitpont.test', 'Rabona'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'lucarne@petitpont.test', 'Lucarne'),
      ('00000000-0000-4000-a000-000000000004'::uuid, 'sombrero@petitpont.test', 'Sombrero_10'),
      ('00000000-0000-4000-a000-000000000005'::uuid, 'roulette@petitpont.test', 'Roulette'),
      ('00000000-0000-4000-a000-000000000006'::uuid, 'talonnade@petitpont.test', 'Talonnade'),
      ('00000000-0000-4000-a000-000000000007'::uuid, 'scorpion@petitpont.test', 'CoupDuScorpion'),
      ('00000000-0000-4000-a000-000000000008'::uuid, 'pigeon@petitpont.test', 'Aile_de_pigeon'),
      ('00000000-0000-4000-a000-000000000009'::uuid, 'grinta@petitpont.test', 'Grinta_FC'),
      ('00000000-0000-4000-a000-000000000010'::uuid, 'lob@petitpont.test', 'Lob_Royal'),
      ('00000000-0000-4000-a000-000000000011'::uuid, 'volee@petitpont.test', 'Reprise.de.volee'),
      ('00000000-0000-4000-a000-000000000012'::uuid, 'coupfranc@petitpont.test', 'Coup_franc')
    ) as t(id, email, username)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email,
      extensions.crypt('petitpont', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"is_demo":true}',
      jsonb_build_object('username', d.username),
      now(), now(), '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), d.id, d.id::text,
            jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end;
$$;

-- Dates d'inscription étalées, une joueuse discrète (activité masquée)
update public.profiles p
set created_at = now() - (interval '4 days' * s.rn) - interval '3 hours'
from (select id, row_number() over (order by id) as rn from public.profiles where is_demo) s
where p.id = s.id;

update public.profiles set hide_activity = true where username = 'Talonnade';

-- -----------------------------------------------------------------------------
-- Collections de démo (tirage déterministe pondéré par rareté)
-- -----------------------------------------------------------------------------
do $$
declare
  u record;
  i int;
  n int;
  roll float;
  r public.rarity;
  tpl int;
begin
  perform setseed(0.2026);
  for u in select id from public.profiles where is_demo order by id loop
    n := 40 + floor(random() * 45)::int;
    for i in 1..n loop
      roll := random() * 100;
      r := case
        when roll < 52 then 'commune'
        when roll < 78 then 'rare'
        when roll < 91 then 'epique'
        when roll < 97 then 'legendaire'
        when roll < 99.3 then 'iconique'
        else 'speciale'
      end;
      select id into tpl from public.card_templates
      where rarity = r and (max_supply is null or minted_count < max_supply)
      order by random() limit 1;
      perform public._mint_card(tpl, u.id, 'seed');
    end loop;
  end loop;
end;
$$;

-- Dates d'obtention réalistes (30 derniers jours)
with dates as (
  select id, now() - (random() * interval '30 days') as at from public.card_instances
)
update public.card_instances ci set obtained_at = d.at from dates d where ci.id = d.id;

update public.card_instance_history h
set created_at = ci.obtained_at
from public.card_instances ci
where ci.id = h.instance_id and h.event = 'minted';

-- -----------------------------------------------------------------------------
-- Fil d'activité historique : obtentions Légendaire / Iconique / Spéciale
-- -----------------------------------------------------------------------------
insert into public.activity_feed (user_id, type, template_id, payload, created_at)
select ci.owner_id, 'rare_pull', ci.template_id,
       jsonb_build_object('instance_id', ci.id, 'serial_number', ci.serial_number, 'rarity', ct.rarity),
       ci.obtained_at
from public.card_instances ci
join public.card_templates ct on ct.id = ci.template_id
join public.profiles p on p.id = ci.owner_id
where public.rarity_rank(ct.rarity) >= 4 and not p.hide_activity;

-- -----------------------------------------------------------------------------
-- Annonces sur le marché : chaque joueur de démo met en vente jusqu'à 3 doublons
-- (exemplaires verrouillés pendant la vente)
-- -----------------------------------------------------------------------------
with dupes as (
  select ci.id as instance_id, ci.owner_id, ci.template_id, ct.rarity,
         row_number() over (partition by ci.owner_id, ci.template_id order by ci.serial_number desc) as copy_rank
  from public.card_instances ci
  join public.card_templates ct on ct.id = ci.template_id
),
picked as (
  select d.*, row_number() over (partition by d.owner_id order by public.rarity_rank(d.rarity) desc, d.instance_id) as pick
  from dupes d
  where d.copy_rank = 1
    and exists (select 1 from dupes d2 where d2.owner_id = d.owner_id and d2.template_id = d.template_id and d2.copy_rank = 2)
),
listed as (
  insert into public.market_listings (seller_id, instance_id, template_id, price, created_at)
  select p.owner_id, p.instance_id, p.template_id,
         ((public.get_setting('duplicate_sell_prices') ->> p.rarity::text)::bigint * (2 + (p.pick % 3)))::bigint,
         now() - (p.pick * interval '7 hours')
  from picked p
  where p.pick <= 3
  returning instance_id
)
update public.card_instances set is_locked = true where id in (select instance_id from listed);

-- -----------------------------------------------------------------------------
-- Listes de souhaits : chaque joueur de démo vise 4 cartes Épiques ou mieux qu'il n'a pas
-- -----------------------------------------------------------------------------
insert into public.wishlists (user_id, template_id)
select p.id, t.id
from public.profiles p
cross join lateral (
  select ct.id from public.card_templates ct
  where public.rarity_rank(ct.rarity) >= 3
    and not exists (select 1 from public.card_instances ci where ci.owner_id = p.id and ci.template_id = ct.id)
  order by random() limit 4
) t
where p.is_demo;

-- -----------------------------------------------------------------------------
-- Historique de ventes réel : des joueurs de démo achètent une douzaine d'annonces
-- via la RPC buy_listing (débit, commission, transfert, journal : tout est cohérent)
-- -----------------------------------------------------------------------------
do $$
declare
  l record;
  v_buyer uuid;
begin
  for l in
    select ml.id, ml.seller_id, ml.price from public.market_listings ml
    where ml.status = 'active' order by ml.created_at limit 12
  loop
    select id into v_buyer from public.profiles
    where is_demo and id <> l.seller_id and coins >= l.price
    order by random() limit 1;
    continue when v_buyer is null;
    perform set_config('request.jwt.claims', json_build_object('sub', v_buyer, 'role', 'authenticated')::text, true);
    perform public.buy_listing(l.id);
  end loop;
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Échanges en attente (créés via la RPC propose_trade) :
-- 3 propositions vers Joueur A (Panenka), 1 de Joueur A vers Joueur B (Rabona)
-- -----------------------------------------------------------------------------
do $$
declare
  v_a uuid := '00000000-0000-4000-a000-000000000001';
  v_b uuid := '00000000-0000-4000-a000-000000000002';
  d record;
  v_mine uuid;
  v_theirs uuid;
  n int := 0;
begin
  for d in
    select id, username from public.profiles where is_demo and id not in (v_a, v_b) order by username limit 3
  loop
    select ci.id into v_theirs from public.card_instances ci join public.card_templates ct on ct.id = ci.template_id
    where ci.owner_id = d.id and not ci.is_locked order by public.rarity_rank(ct.rarity) desc, ci.id limit 1;
    select ci.id into v_mine from public.card_instances ci
    where ci.owner_id = v_a and not ci.is_locked order by ci.serial_number desc, ci.id limit 1 offset n;
    perform set_config('request.jwt.claims', json_build_object('sub', d.id, 'role', 'authenticated')::text, true);
    perform public.propose_trade(v_a, array[v_theirs], array[v_mine], 0, case n when 1 then 50 else 0 end,
      case n when 0 then 'Salut ! Ma meilleure carte contre une des tiennes ?' when 1 then 'Avec 50 pièces de ta part, deal ?' else null end);
    n := n + 1;
  end loop;

  select ci.id into v_mine from public.card_instances ci where ci.owner_id = v_a and not ci.is_locked order by ci.id limit 1;
  select ci.id into v_theirs from public.card_instances ci where ci.owner_id = v_b and not ci.is_locked order by ci.id limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  perform public.propose_trade(v_b, array[v_mine], array[v_theirs], 100, 0, 'Petit échange entre testeurs ?');
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;
