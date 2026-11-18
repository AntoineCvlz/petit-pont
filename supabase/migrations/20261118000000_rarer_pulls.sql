-- =============================================================================
-- Probabilités revues à la baisse (décision du porteur du projet, 18 nov. 2026) : les hautes raretés tombaient trop
-- souvent (22 packs gratuits → 14 Légendaires). Le pack gratuit passe à 5 cartes : 2 Bronze, 2 Argent, 1 Or.
-- =============================================================================

update public.boosters
set cards_count = 5,
    slots = '[{"booster": "bronze", "count": 2}, {"booster": "standard", "count": 2}, {"booster": "premium", "count": 1}]',
    description = '2 Bronze, 2 Argent et 1 Or. Un nouveau toutes les 10 minutes, jusqu''à 10 en réserve.'
where slug = 'gratuit';

-- Nouvelles cotes (total vérifié à 100 % en fin de transaction)
delete from public.booster_odds
where booster_id in (select id from public.boosters
                     where slug in ('gratuit', 'standard', 'premium')
                        or category in ('europe', 'championnat', 'nation', 'style'));

insert into public.booster_odds (booster_id, rarity, probability)
select b.id, o.rarity::public.rarity, o.p
from (values
  -- Argent (65-74) : surtout des Communes
  ('standard', 'commune', 80.00), ('standard', 'rare', 20.00),
  -- Or (75+) : l'Épique devient une belle prise, la Légendaire un événement
  ('premium', 'rare', 70.00), ('premium', 'epique', 25.00), ('premium', 'legendaire', 4.00),
  ('premium', 'iconique', 0.80), ('premium', 'speciale', 0.20),
  -- Gratuit : moyenne indicative des 5 cartes (le tirage suit les emplacements Bronze / Argent / Or)
  ('gratuit', 'commune', 72.00), ('gratuit', 'rare', 22.00), ('gratuit', 'epique', 5.00),
  ('gratuit', 'legendaire', 0.80), ('gratuit', 'iconique', 0.16), ('gratuit', 'speciale', 0.04)
) as o(slug, rarity, p)
join public.boosters b on b.slug = o.slug;

-- Boosters à thème (championnats, nations, styles, coupes d'Europe) : toujours au moins une Rare
insert into public.booster_odds (booster_id, rarity, probability)
select b.id, o.rarity::public.rarity, o.p
from public.boosters b
cross join (values ('commune', 68.00), ('rare', 25.00), ('epique', 5.50), ('legendaire', 1.20),
                   ('iconique', 0.25), ('speciale', 0.05)) as o(rarity, p)
where b.category in ('europe', 'championnat', 'nation', 'style');
