-- =============================================================================
-- Fiche joueur détaillée (import d'un catalogue externe, cf. scripts/fc27/) :
-- identifiant externe, date de naissance, pied fort, étoiles mauvais pied / gestes techniques,
-- poste précis, postes secondaires, statistiques.
-- Les données elles-mêmes ne sont PAS versionnées : elles sont chargées par script sur chaque base.
-- =============================================================================

alter table public.players
  add column ext_id int unique,
  add column birthdate date,
  add column preferred_foot text check (preferred_foot in ('Droit', 'Gauche')),
  add column weak_foot smallint check (weak_foot between 1 and 5),
  add column skill_moves smallint check (skill_moves between 1 and 5),
  add column position_detail text check (position_detail ~ '^[A-Z]{2,3}$'),
  add column alt_positions text[] not null default '{}',
  add column stats jsonb;

comment on column public.players.stats is
  'Statistiques : {"pac","sho","pas","dri","def","phy"} (1-99) + détail ; gardiens : {"div","han","kic","ref","spd","pos"}.';

-- Tirage en booster : candidats actifs par rareté (catalogue de plusieurs milliers de cartes)
create index card_templates_active_rarity_idx on public.card_templates (rarity) where is_active;
create index player_clubs_club_idx on public.player_clubs (club_id);
