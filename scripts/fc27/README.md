# Import du catalogue joueurs

Charge un fichier CSV de joueurs (une ligne par joueur, colonnes `player_id`, `common_name`, `first_name`,
`last_name`, `overall_rating`, `position`, `alternate_positions`, `club`, `league`, `nationality`, `gender`,
`preferred_foot`, `skill_moves`, `weak_foot`, `birthdate`, `pace` … `physicality`) dans la base du jeu.

**Le fichier et le SQL généré ne sont jamais versionnés** (`archive/` et `scripts/fc27/out/` sont dans
`.gitignore`) : le dépôt est public et ces données appartiennent à leur éditeur. Usage privé uniquement.

## Ce que fait l'import (idempotent)

- Nations, ligues et clubs manquants créés ; les clubs déjà présents gardent nom, couleurs et écusson.
- Joueurs déjà présents rapprochés (nom + année de naissance, + `PLAYER_MATCHES` dans `referentiel.mjs`)
  et complétés ; nouveaux joueurs créés (hommes uniquement).
- Fiche : date de naissance, pied fort, étoiles mauvais pied / gestes techniques, poste précis, stats.
- Une carte de base « Saison 2026-27 » par joueur. Rareté selon la note : Commune < 70, Rare 70-76,
  Épique 77-82, Légendaire ≥ 83 (tirage limité à 100). Iconique et Spéciale restent aux éditions spéciales.
- Les cartes de base « Saison 2026 » ne sont plus tirables (les exemplaires possédés restent) ;
  les albums de cette saison sont remplacés par un album par club des 5 grands championnats + Équipe de France.
- Relancer l'import après une mise à jour du fichier met à jour notes, clubs et étoiles.

## Étapes

```bash
# 1. Photos libres des joueurs notés 80+ (Wikidata : nom + date de naissance exacte ; Commons, licence libre)
node scripts/fc27/photos.mjs archive/players.csv 80
# 2. Détourage (cf. scripts/media/cutout.mjs, dépendance hors projet), puis publication + crédits
node cutout.mjs <projet>/scripts/media/raw/players <sortie> fc12345 fc67890 …
node scripts/fc27/publish-photos.mjs <sortie>
# 3. SQL d'import
node scripts/fc27/build-sql.mjs archive/players.csv        # → scripts/fc27/out/import.sql
# 4a. Base locale
docker exec -i supabase_db_petit-pont psql -U postgres -d postgres < scripts/fc27/out/import.sql
# 4b. Production (après le déploiement du code, qui applique les migrations)
scp scripts/fc27/out/import.sql deploy@<vps>:/tmp/import.sql
ssh deploy@<vps> 'cd /opt/petit-pont/deploy && docker compose exec -T db psql -U postgres -d postgres < /tmp/import.sql && rm /tmp/import.sql'
```

`supabase db reset` efface l'import local : relancer l'étape 4a.
