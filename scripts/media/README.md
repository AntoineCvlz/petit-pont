# Médias des cartes

Photos des joueurs (licences libres, Wikimedia Commons) et écussons des clubs (Wikipédia).
Les fichiers publiés sont dans `public/media/` ; les crédits dans `src/lib/media-credits.json` (page `/credits`).

1. `node scripts/media/wikidata.mjs` : identifiants Wikidata, club actuel (P54), photo (P18).
2. `node scripts/media/infobox.mjs` : club actuel selon l'infobox Wikipédia (2e source pour le mercato).
3. `node scripts/media/fetch.mjs` : télécharge photos et écussons dans `raw/` (non versionné) + `sources.json`.
4. `cutout.mjs` (voir l'en-tête, dépendance installée hors du projet) : détourage + recadrage buste.
5. `node scripts/media/build.mjs <dossier détouré>` : copie dans `public/media/` et écrit les crédits.

`overrides.json` (facultatif) : `{ "players": { "<slug>": { file, page, author, license, licenseUrl } } }` pour
remplacer la photo choisie par Wikidata (la mettre aussi dans `raw/players/<slug>.jpg`).
Les URL (`players.image_url`, `clubs.crest_url`) sont renseignées par le seed et la migration `…_transfers_media.sql`.
