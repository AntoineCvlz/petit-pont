# PROGRESS — Petit Pont

## Comptes de test

Tous les comptes de démo (`is_demo = true`) ont le mot de passe **`petitpont`**.

| Rôle | E-mail | Pseudo |
|---|---|---|
| Joueur A | `joueur.a@petitpont.test` | Panenka |
| Joueur B | `joueur.b@petitpont.test` | Rabona |
| Autres démo | `lucarne@`, `sombrero@`, `roulette@`, `talonnade@`, `scorpion@`, `pigeon@`, `grinta@`, `lob@`, `volee@`, `coupfranc@` + `petitpont.test` | — |

Talonnade a l'option « masquer mon activité » activée (absente du fil).

## Démarrage local

```bash
npm install
npx supabase start          # Docker requis ; la CLI est en devDependency
cp .env.example .env.local  # puis coller la clé « Publishable » de `npx supabase status`
npx supabase db reset       # migrations + seed
npm run dev
```

> Si le port 3000 est occupé, Next bascule sur 3001 : penser à l'ajouter dans `additional_redirect_urls` de `supabase/config.toml` le jour où des redirections d'auth (e-mail, OAuth) seront utilisées.

## Phase 1 — Fondations ✅ (2026-11-12)

### Fait
- **Projet** : Next.js 16.4 (App Router, Cache Components, Turbopack), TypeScript strict, Tailwind 4, Framer Motion, Vitest.
- **Supabase local** : `supabase/config.toml` (analytics désactivé, confirmation e-mail désactivée en local).
- **Schéma complet** (`supabase/migrations/20261112000000_init_schema.sql`) : les 21 tables de la spec + `app_settings`, `player_clubs`, `card_instance_history`, `profile_showcase`, `album_completions`, `market_searches`, `banned_words`.
  - RLS activée sur **toutes** les tables ; les clients n'ont aucun droit d'écriture sauf : paramètres de leur profil (droits par colonne), `notifications.is_read`, leur liste de souhaits.
  - `_apply_coins` : seul point qui modifie `profiles.coins` (verrou `FOR UPDATE`, refus du solde négatif, journalisation avec `balance_after`). Journal `coin_transactions` immuable (trigger). Vue `coin_balance_audit`.
  - `_mint_card` : verrou sur le modèle, respect du tirage limité, numéros de série consécutifs, historique.
  - Ces deux fonctions internes sont révoquées pour `anon`/`authenticated` (les RPC des phases suivantes les appelleront).
  - Inscription : trigger `handle_new_user` → profil + solde de départ journalisé ; pseudo validé (format, unicité insensible à la casse, mots interdits). `is_demo` n'est lu que dans `raw_app_meta_data` (non falsifiable à l'inscription).
  - Probabilités des boosters : contrainte différée « total = 100 % ».
  - Publication Realtime préparée (`notifications`, `market_listings`, `boosters`, `trades`).
- **Seed** (`supabase/seed.sql`) : 31 nations (drapeaux stylisés générés), 39 clubs (écussons génériques), 147 joueurs dont les 10 têtes d'affiche et 22 légendes, **170 cartes** (56 Communes, 39 Rares, 31 Épiques, 26 Légendaires, 12 Iconiques, 6 Spéciales), 5 boosters (gratuit, standard, premium, événementiel, limité) avec probabilités, 6 albums, 12 comptes de démo avec ~740 exemplaires, 36 annonces sur le marché (exemplaires verrouillés), 67 événements dans le fil d'activité.
- **Auth** : inscription / connexion / déconnexion (Server Actions), `src/proxy.ts` protège le jeu et rafraîchit la session, redirection interne sécurisée (`?suite=`).
- **Layout** : barre supérieure (logo, solde, menu joueur), navigation latérale (desktop), barre inférieure mobile (5 entrées max, menu « Plus » au-delà), squelettes de chargement.
- **Design system** : thème nuit/pelouse, `Card` (cadre et couleur par rareté, brillance à partir de Rare, holographique animé au pointeur pour Spéciale), `RarityBadge`, `Flag`, `Crest`, `Button`, `Panel`, `Field`, `Toggle`, `Avatar`, `CoinAmount`, `Skeleton`. Logo original (ballon sous une arche) + favicon. Animations réduites : `prefers-reduced-motion` **et** réglage du profil.
- **Pages (données réelles uniquement)** :
  - Accueil : progression, dernières cartes obtenues, fil d'activité.
  - Collection : grille regroupée par carte avec compteur d'exemplaires.
  - Wiki : recherche de joueurs, fiche (bio, nation, clubs, toutes les versions, nombre en circulation, prix moyen au marché).
  - Profil : pseudo modifiable (validé côté serveur), stats, paramètres (sons, animations réduites, masquer mon activité).

### Comment tester
- `npm run lint` · `npm run typecheck` · `npm test` (14 tests unitaires) · `npm run test:db` (24 tests pgTAP : RLS, inscription, journal, tirage limité, droits) · `npm run build`.
- Navigateur : se connecter avec Joueur A, puis Joueur B dans une fenêtre privée → collections différentes, même fil d'activité ; activer « Animations réduites » → l'effet holo de Mbappé (Wiki → Kylian Mbappé) s'arrête.
- Multijoueur (sécurité) vérifié avec deux sessions réelles : A ne peut ni modifier le profil de B, ni voir son journal, ni réattribuer ses cartes ; B ne peut pas changer son solde ; les RPC internes sont refusées.

### Limites connues
- Navigation volontairement réduite aux pages prêtes : Albums, Marché, Échanges et Classement n'apparaîtront qu'avec leur phase (règle « aucune fausse fonctionnalité »). Idem pour la cloche de notifications.
- Les annonces du marché seedées existent en base mais ne sont pas encore affichées (phase 5).
- Les propositions d'échange des comptes démo vers « le premier vrai compte » seront créées en phase 6 (trigger à l'inscription).
- Pas de filtres/tri dans la collection (phase 3). Pas d'avatars uploadés (Storage plus tard).
- Données joueurs illustratives : effectifs « Saison 2026 » et notes fictives.
- Vérification visuelle automatisée dans un navigateur non faite (outil navigateur indisponible pendant la session) : rendu des pages, redirections et sessions vérifiés par un test HTTP de bout en bout avec deux comptes.

## Phase 2 — Boosters ✅ (2026-11-12)

### Fait
- **Migration** `20261112010000_boosters.sql` :
  - `open_booster(booster_id)` (RPC atomique, `SECURITY DEFINER`) : vérifie actif / dates / délai du gratuit / stock / solde, verrouille le profil (`FOR UPDATE`, sérialise les doubles clics), décrémente le stock limité de façon atomique, débite via `_apply_coins`, tire chaque carte côté serveur selon `booster_odds`, applique les garanties (les dernières places sont tirées parmi les raretés garanties, probabilités renormalisées), respecte les tirages limités, crée les exemplaires, journalise l'ouverture, publie les Légendaires / Iconiques / Spéciales dans le fil (sauf activité masquée). Renvoie les cartes avec `is_new`.
  - `sell_duplicates(instance_ids[])` : revente au système (prix par rareté dans `app_settings`), refuse un exemplaire d'autrui, verrouillé (vente / échange) ou le dernier exemplaire d'une carte. Les exemplaires revendus sont supprimés ; leur numéro de série n'est jamais réattribué.
  - `booster_availability(booster_id)` : état affiché (disponible, en recharge + heure, épuisé, pas commencé, terminé).
  - Fonctions de tirage internes (`_roll_rarity`, `_pick_template`) non exposées.
- **Boutique** `/boosters` : les 5 boosters, prix, nombre de cartes, garantie, probabilités, fin d'événement, stock limité **en direct** (Supabase Realtime).
- **Fiche** `/boosters/[slug]` : ouverture, fiche, probabilités par carte, liste des cartes possibles par rareté (avec tirage restant des cartes limitées).
- **Ouverture** : paquet qui tremble pendant l'appel serveur, déchirure, cartes face cachée, révélation une par une ou « Tout révéler », halo pour les hautes raretés, « Petit pont réussi ! », récapitulatif NOUVEAU / DOUBLON, bouton « Revendre les doublons (+X) ». Sons synthétisés (Web Audio, aucun fichier) si activés dans le profil. Animations coupées si `prefers-reduced-motion` ou réglage du profil.
- **Barre supérieure** : compte à rebours du booster gratuit (lien direct quand il est prêt). **Accueil** : encart booster gratuit ; états vides qui renvoient vers les boosters.

### Comment tester
- `npm run test:db` : 50 tests pgTAP (dont 26 pour les boosters : débit, garanties sur 30 ouvertures, NOUVEAU unique, délai, solde insuffisant sans effet, stock épuisé, événement terminé, revente).
- `npm run test:integration` (Supabase local démarré) : **concurrence réelle** en requêtes parallèles :
  - 8 clics simultanés sur le booster gratuit → 1 seule ouverture ;
  - 10 achats simultanés à 200 avec 1 000 pièces → exactement 5, solde à 0 ;
  - 2 joueurs qui se disputent les 3 derniers boosters limités → exactement 3 ventes, stock à 0 ;
  - 5 reventes simultanées du même doublon → 1 seule créditée ;
  - Realtime : B voit le stock baisser quand A achète.
- Navigateur : Joueur A ouvre le booster « Coupe des Étoiles » pendant que Joueur B (fenêtre privée) regarde la boutique → le stock de B baisse sans rechargement.

### Limites connues
- Les tests d'intégration créent des comptes (`*@integration.test`) qui restent en base locale (journal immuable) : `npx supabase db reset` pour repartir de zéro.
- Pas encore de page « historique des ouvertures » (données dans `booster_openings`).
- La revente depuis la collection (et pas seulement depuis le récapitulatif) arrive en phase 4.

## Phase 3 — Collection et albums ✅ (2026-11-12)

### Fait
- **Migration** `20261112020000_albums.sql` :
  - `album_progress(user, album)` : emplacements remplis / total (une carte compte dès qu'on en possède un exemplaire, même en vente).
  - `claim_album_reward(album_id)` (RPC atomique) : verrou du profil, refus si déjà réclamée ou incomplet (complétion revérifiée côté serveur), enregistrement dans `album_completions` (une seule fois, clé primaire), crédit via `_apply_coins`, événement « album complété » dans le fil (sauf activité masquée).
- **Collection** `/collection` : composant réutilisable `FilterBar` synchronisé avec l'URL (lien partageable) : recherche sans accents (joueur, club, nation, édition), rareté, club, nation, poste, doublons uniquement, tri par rareté / note / date d'obtention / numéro / nom. Les listes club et nation ne proposent que ce que le joueur possède. Compteur d'exemplaires sur chaque carte.
- **Détail** `/collection/[id]` : grande carte, tous les exemplaires (numéro de série, provenance, date, engagé en vente / échange), historique de chaque exemplaire.
- **Albums** `/albums` : progression (%), récompense, statut (complété / à réclamer). `/albums/[slug]` : emplacements numérotés ; possédé = carte en couleur (lien vers le détail) ; manquant = grisé avec numéro, rareté et silhouette ; bouton « Réclamer » quand l'album est complet.
- **Accueil** : « Albums en cours » (les 3 plus avancés).
- Navigation : 6 entrées → sur mobile, 4 entrées + menu « Plus » (Wiki, Profil).

### Comment tester
- `npm test` : 26 tests unitaires (dont filtres / tris de collection).
- `npm run test:db` : 61 tests pgTAP (dont 11 albums : incomplet refusé, versement unique, cartes d'un autre joueur non comptées, journal cohérent).
- `npm run test:integration` : 6 réclamations simultanées → 1 seule récompense.
- Navigateur : Joueur A → Collection → filtre « Doublons » + tri « Note » ; ouvrir une carte → historique. Albums → Coupe des Étoiles : emplacements grisés.

### Limites connues
- Le détail `/collection/[id]` ne montre que ses propres exemplaires ; la collection publique d'un autre joueur arrive avec les profils publics (phase 7).
- Une fois réclamé, un album reste complété même si l'on revend ou échange ensuite une de ses cartes (choix assumé : la récompense est unique).

## Phase 4 — Économie ✅ (2026-11-12)

### Fait
- **Migrations** `20261112030000_economy.sql` et `20261112030100_coin_totals.sql` :
  - `claim_daily_bonus()` : une fois par jour calendaire dans le fuseau du jeu (`app_settings.timezone`, Europe/Paris), montant `app_settings.daily_bonus` ; verrou du profil contre les doubles demandes. `daily_bonus_status()` pour l'affichage (disponible / prochain bonus).
  - `sell_all_duplicates(max_rarity)` : revend en une transaction tous les doublons libres jusqu'à une rareté plafond ; garde par carte l'exemplaire libre au plus petit numéro de série ; ne touche jamais aux exemplaires verrouillés ; sans plafond de quantité (lots de 200 internes).
  - `my_coin_totals()` : totaux gagnés / dépensés calculés en base.
- **Bonus quotidien** : encart sur l'accueil + bouton compact dans la barre supérieure (écrans ≥ sm) tant qu'il est disponible.
- **Revente depuis la collection** : bouton « Revendre les doublons » (modale de confirmation, plafond de rareté, aperçu du nombre et du gain calculé avec la même règle que le serveur) ; sur la fiche d'une carte, sélection exemplaire par exemplaire (au moins un conservé, exemplaires engagés non sélectionnables).
- **Historique des pièces** `/profil/pieces` : solde, total gagné / dépensé, filtre par type, pagination (25 / page), solde après chaque mouvement. Lien depuis le profil.
- Composants réutilisables : `Modal` (`<dialog>` natif : focus piégé, Échap, clic sur le fond), `FilterBar` avec recherche optionnelle et retour en page 1 à chaque changement de filtre.

### Comment tester
- `npm test` : 28 tests unitaires (dont aperçu de revente groupée).
- `npm run test:db` : 75 tests pgTAP (dont 14 économie : bonus unique par jour puis le lendemain, plafond de rareté, plus petit numéro conservé, exemplaire verrouillé préservé).
- `npm run test:integration` : 6 bonus simultanés → 1 versement ; 4 reventes groupées simultanées → chaque doublon vendu une seule fois (9 vendus, +90).
- Navigateur : Joueur A → Accueil → « Récupérer 100 pièces » (le solde de la barre se met à jour) → Collection → « Revendre les doublons » → plafond « Rare et en dessous » → confirmer → Profil → Historique des pièces.

### Limites connues
- Pas de série de connexions (bonus croissant) : la spec ne demande qu'un bonus quotidien fixe.
- Les lectures de collection passent par PostgREST (1 000 lignes max par requête) : suffisant pour les collections actuelles, à paginer ou agréger en SQL en phase 9 si un joueur dépasse 1 000 exemplaires.

## Phases suivantes
5. Marché · 6. Échanges · 7. Communauté · 8. Administration · 9. Finitions

## Conventions techniques à retenir
- Toute nouvelle table : `enable row level security` + `revoke insert, update, delete … from anon, authenticated` (les privilèges par défaut de Supabase les accordent).
- Toute nouvelle fonction interne : `revoke execute … from public, anon, authenticated`.
- Après chaque migration : `npm run db:types`.
- Cache Components : les lectures Supabase passent par `createClient()` (qui appelle `connection()`) ; chaque route du jeu a son `loading.tsx`.
