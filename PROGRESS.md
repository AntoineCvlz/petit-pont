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

## Phase 5 — Marché ✅ (2026-11-12)

### Fait
- **Migrations** `20261112040000_market.sql` et `20261112040100_player_search.sql` :
  - `create_listing(instance, prix)` : propriétaire, exemplaire libre, prix 1 à 1 000 000, 50 annonces actives max (configurables) ; verrouille l'exemplaire (plus revendable au système ni échangeable) et le retire des vitrines.
  - `cancel_listing(annonce)` : vendeur uniquement, annonce active uniquement ; déverrouille.
  - `buy_listing(annonce)` : verrou de l'annonce (départage les acheteurs simultanés), verrou des **deux profils dans un ordre fixe** (pas d'interblocage sur achats croisés), débit acheteur, crédit vendeur moins la commission (`market_fee_percent`, 5 %, arrondie à l'inférieur, détruite = puits de monnaie), transfert + historique de l'exemplaire, `market_sales`, **notification au vendeur**, « vente importante » dans le fil au-delà de `big_sale_threshold` (2 000, sauf activité masquée).
  - `record_market_search` (recherche texte rattachée aux cartes correspondantes, ou consultation d'une carte ; dédoublonnée par joueur et par heure), vue `most_wanted_cards` (recherches 30 j + 3 × listes de souhaits), vue `market_price_stats`.
  - `players.search_text` (minuscules sans accents, trigger + index trigramme) : recherche « mbappe », « Luka Modrić », « vinicius junior »… (marché et wiki).
- **Seed** : 12 ventes réelles passées par `buy_listing` (journal cohérent, commissions prélevées), 48 souhaits.
- **Marché** `/marche` : onglets Annonces (recherche joueur, rareté, club, nation, tranche de prix, tri prix ↑ / ↓ / récentes, pagination 30), Dernières ventes, Les plus recherchées, Mes annonces. Achat avec modale de confirmation (prix, solde après achat). **En direct** : une annonce vendue passe en « Vendue » et une annonce retirée disparaît chez tous les visiteurs ; bandeau « N nouvelles annonces ».
- **Historique de prix** `/marche/carte/[id]` : dernière vente, moyenne, plus bas, plus haut, annonces en cours, historique des ventes, bouton liste de souhaits.
- **Fiche carte (collection)** : mise en vente (exemplaire, prix conseillé, net après commission), annonces en cours avec « Retirer ». **Wiki** : lien « Voir au marché ». **Accueil** : activité du marché.

### Comment tester
- `npm run test:db` : 105 tests pgTAP (dont 30 marché).
- `npm run test:integration` : 14 tests, dont 5 acheteurs simultanés (1 gagnant, les autres non débités), vendeur qui retire pendant un achat (une seule action passe, état cohérent, 3 essais), achats croisés A↔B en parallèle sans interblocage, Realtime (C voit l'annonce vendue).
- **Deux comptes** : Joueur A (fenêtre normale) met une carte en vente depuis sa fiche ; Joueur B (fenêtre privée) la trouve au marché et l'achète → l'annonce passe « Vendue » en direct chez A, le solde de A augmente du prix moins 5 %, la carte apparaît dans la collection de B avec son historique.

### Limites connues
- La notification « carte vendue » est enregistrée en base mais la cloche / page de notifications arrive en phase 7.
- Pas de graphique d'historique de prix : tableau + statistiques (un graphique pourra être ajouté en phase 9).
- Pas d'expiration automatique des annonces (non demandée).

## Phase 6 — Échanges ✅ (2026-11-12)

### Fait
- **Migration** `20261112050000_trades.sql` :
  - `propose_trade(destinataire, offerts[], demandés[], pièces données, pièces demandées, message, parent)` : au moins une carte, 10 max par côté, pas de doublon, cartes possédées par le bon joueur et non en vente, offre en pièces couverte par le solde, 20 propositions en attente max, blocage dans un sens ou dans l'autre = refus. **Aucun verrouillage** à la proposition (impossible de bloquer les cartes d'autrui en lui envoyant des propositions). Avec `parent` : contre-proposition (l'originale passe « contre-proposée »). Notification au destinataire.
  - `accept_trade` : verrou de l'échange, des deux profils (ordre fixe) puis des exemplaires (ordre fixe) ; **revérifie** propriété et absence de mise en vente de chaque exemplaire, applique les pièces dans les deux sens (`trade_sent` / `trade_received`), transfère, historise, retire des vitrines ; les autres propositions en attente portant sur ces exemplaires deviennent **caduques** (annulées). Notification au proposant.
  - `decline_trade` (destinataire), `cancel_trade` (proposant), `expire_trades()` + tâche **pg_cron** horaire (`petit-pont-expire-trades`) ; une proposition échue est aussi refusée à l'acceptation et affichée « Expiré » même avant le passage de la tâche.
  - Trigger `welcome_first_real_player` : au **premier vrai compte** inscrit, trois joueurs de démo lui proposent chacun un doublon contre des pièces (spec §12).
- **Seed** : 3 propositions en attente vers Joueur A (dont une demandant 50 pièces) et 1 de Joueur A vers Joueur B, créées via `propose_trade`.
- **Échanges** `/echanges` : onglets Reçus (avec compteur) / Envoyés / Terminés ; chaque échange montre les cartes et pièces des deux côtés, le message, l'expiration ; Accepter (confirmation), Refuser, Contre-proposer, Annuler. **En direct** : la page se rafraîchit dès qu'un échange me concernant change (Realtime + RLS).
- **Composeur** `/echanges/nouveau?avec=pseudo` : recherche du joueur (insensible à la casse), deux colonnes sélectionnables avec filtre, cartes **souhaitées par l'autre joueur** et cartes **absentes de ma collection** mises en évidence, pièces des deux côtés, message. `?contre=id` : contre-proposition préremplie (côtés inversés).
- **Accueil** : bandeau « N échanges en attente ».

### Comment tester
- `npm run test:db` : 139 tests pgTAP (dont 34 échanges : propositions invalides, RLS, contre-proposition, acceptation, carte mise en vente entre-temps, refus, annulation, expiration, blocage).
- `npm run test:integration` : 20 tests, dont 5 acceptations simultanées (1 transfert), deux propositions pour la même carte acceptées en même temps (1 acceptée, l'autre caduque), acceptation vs mise en vente simultanées, acceptation vs annulation simultanées, Realtime (le proposant voit l'acceptation).
- **Deux comptes** : Joueur A (fenêtre normale) → Échanges → « Proposer un échange » → `Rabona` → choisir une carte de chaque côté → envoyer ; Joueur B (fenêtre privée) voit la proposition apparaître sans recharger → « Contre-proposer » (ajouter 25 pièces demandées) → A voit la contre-proposition en direct → Accepter → les cartes et pièces ont changé de main, historique visible sur la fiche de la carte.

### Limites connues
- Le blocage d'un joueur est appliqué par la RPC, mais l'interface pour bloquer arrive en phase 8 (modération) ; les profils publics avec bouton « Proposer un échange » en phase 7.
- « Premier vrai compte » : si les tests d'intégration tournent avant ta première inscription, c'est un compte de test qui reçoit les propositions de bienvenue → `npx supabase db reset` avant de t'inscrire.

## Phase 7 — Communauté ✅ (2026-11-12)

### Fait
- **Migration** `20261112060000_community.sql` :
  - Vue matérialisée `leaderboard_stats` (joueur × période : 7 j glissants, 30 j glissants, tout temps) : progression (% du catalogue), cartes, cartes différentes, score de rareté pondéré (`app_settings.rarity_weights` : 1 / 3 / 8 / 20 / 50 / 120), albums complétés, boosters ouverts. Rafraîchie toutes les **10 minutes par pg_cron** (`petit-pont-refresh-leaderboards`).
  - `get_leaderboard(métrique, période, limite)` : rangs ex aequo, métrique et période sur liste blanche, **ma ligne toujours renvoyée** même hors limite.
  - `refresh_leaderboards()` : rafraîchit et publie dans le fil les **entrées dans un top 10** (tout temps, sauf activité masquée), sans doublon grâce à `leaderboard_top10`.
  - `set_showcase(exemplaires[])` : vitrine de 5 cartes possédées et non en vente (une mise en vente ou un échange retire la carte de la vitrine).
  - `wishlist_matches()` : joueurs ayant en double (exemplaires libres) des cartes de ma liste de souhaits, en excluant les blocages.
  - `mark_all_notifications_read()`.
- **Notifications** : cloche dans la barre supérieure avec compteur de non-lues **en direct** (Realtime filtré sur le joueur + RLS) et **toast** à chaque nouvelle notification (vente, proposition / contre-proposition / acceptation / refus / expiration d'échange) ; page `/notifications` (pagination, clic = lu + lien, « Tout marquer comme lu »).
- **Classement** `/classement` : 5 métriques × 3 périodes, médailles, **ta position toujours visible** (bandeau collant + ligne en bas si hors top 50), date de mise à jour.
- **Joueurs** `/joueurs` : recherche par pseudo, suggestions « Ils ont des cartes de ta liste de souhaits » avec « Proposer un échange ».
- **Profil public** `/joueurs/[pseudo]` : statistiques, vitrine, doublons disponibles à l'échange, liste de souhaits, albums complétés, « Voir la collection », « Proposer un échange ». **Collection publique** `/joueurs/[pseudo]/collection` (mêmes filtres que la sienne).
- **Profil** : éditeur de vitrine, liste de souhaits, lien vers le profil public. **Accueil** : suggestions. **Fil d'activité** : chaque entrée renvoie vers le profil du joueur, la carte ou le classement.
- Navigation complète (9 entrées de la spec ; mobile : 4 + « Plus »).

### Comment tester
- `npm run test:db` : 159 tests pgTAP (dont 20 communauté : score pondéré, top 10 publié une seule fois, métrique hors liste blanche refusée, ma position toujours renvoyée, suggestions, vitrine, notifications privées, classements non lisibles anonymement).
- `npm run test:integration` : 21 tests, dont notification de vente reçue **en direct** par le vendeur et **rien** chez un tiers (y compris abonné sans filtre).
- **Deux comptes** : Joueur B (fenêtre privée) met une carte en vente ; Joueur A l'achète → chez B, la cloche passe à 1 et un toast « Carte vendue ! » apparaît sans rechargement. A → Classement → sa position est surlignée ; Joueurs → Rabona → vitrine, doublons, « Proposer un échange ».

### Limites connues
- Les classements ont jusqu'à 10 minutes de retard (vue matérialisée) ; la date de mise à jour est affichée.
- « Semaine » et « mois » sont glissants (7 et 30 jours) ; une carte reçue par échange ou achat compte à sa date de réception.
- Signalement et blocage depuis le profil public : phase 8.

## Phase 8 — Administration et modération ✅ (2026-11-12)

### Compte administrateur (local)
`admin@petitpont.test` / `petitpont` (pseudo « Arbitre »). Le rôle vient de `raw_app_meta_data.is_admin` (impossible à s'attribuer à l'inscription). Pour promouvoir un autre compte : `update public.profiles set is_admin = true where username = '…';` dans la base.

### Fait
- **Migration** `20261112070000_admin_moderation.sql` :
  - Écritures admin sur le référentiel (nations, clubs, footballeurs, cartes, albums, boosters, paramètres) par **RLS `is_admin()`** et droits par colonne : `minted_count` (numéros de série) n'est jamais modifiable ; `max_supply` ne peut pas descendre sous le nombre déjà édité ; nouvelle carte = numéro de collection attribué automatiquement.
  - `admin_set_booster_odds` (remplacement complet, **total = 100 %** vérifié, raretés et décimales contrôlées), `admin_set_album_slots` (liste ordonnée de numéros de collection), `admin_economy_stats`, `admin_resolve_report`, **`admin_purge_demo_accounts`** (supprime les comptes `is_demo` et tout ce qui en dépend ; seule exception autorisée à l'immuabilité du journal, puis recalcul des classements).
  - Modération : `report_player` (motif 3 à 500 caractères, un signalement ouvert par couple), `block_player` (annule aussi les échanges en attente entre les deux) / `unblock_player`. Un joueur bloqué ne peut plus proposer d'échange et disparaît des suggestions (déjà appliqué par `propose_trade` / `wishlist_matches`).
  - Le rôle admin est exclu du trigger « premier vrai compte ».
- **`/admin`** (lien dans le menu joueur pour les admins) : tableau de bord de l'économie (joueurs, actifs 7 j, pièces en circulation, créées / dépensées par type, commissions détruites, volume du marché, ouvertures par booster, exemplaires par rareté, échanges, signalements, **soldes incohérents**), purge des démos avec confirmation ; pages Joueurs, Cartes, Albums (emplacements par numéros de collection), Boosters (prix, garanties, dates en heure de Paris, stocks, **éditeur de probabilités avec total en direct**), Signalements (ouverts / clos, traité / sans suite).
- **Profil public** : boutons Signaler (modale) et Bloquer / Débloquer ; « Proposer un échange » masqué si bloqué.

### Comment tester
- `npm test` : 43 tests unitaires (dont lecture des formulaires admin, total des probabilités à 100 % au centième près, conversion heure de Paris été / hiver).
- `npm run test:db` : 189 tests pgTAP (dont 30 admin : `is_admin` non falsifiable, RLS des écritures, probabilités, `minted_count` protégé, numérotation auto, emplacements, signalement, blocage, purge).
- Navigateur : `admin@petitpont.test` → menu → Administration → Boosters → modifier les probabilités (le total doit rester à 100 %). Avec Joueur A : profil de Rabona → Bloquer → Joueur B ne peut plus proposer d'échange à A.

### Limites connues
- Pas de suppression des footballeurs / cartes déjà possédés (clé étrangère) : on les désactive (`is_active`).
- Pas de journal d'audit des actions admin.
- Les formulaires admin ont été vérifiés par les tests unitaires de lecture et par des écritures RLS réelles avec le compte admin ; l'envoi des formulaires via le navigateur reste à faire à la main.

## Phase 9 — Finitions ✅ (2026-11-12)

Vérification réalisée dans un **vrai navigateur** (Chromium headless piloté par Playwright, desktop 1440 × 900 et mobile 390 × 844), avec captures d'écran examinées, parcours interactifs à deux joueurs et audit d'accessibilité axe-core.

### Corrigé grâce à la vérification navigateur
- **Temps réel dans le navigateur (bloquant)** : notifications, toasts et rafraîchissement des échanges ne fonctionnaient pas côté navigateur (les tests d'intégration Node appelaient `setAuth()` explicitement et masquaient le problème). Deux causes : (1) la session du client navigateur est initialisée paresseusement, la connexion Realtime partait sans le jeton du joueur et la RLS filtrait tout ; (2) un composant démonté / remonté (double montage React, navigation) fermait l'abonnement serveur partagé par son successeur. Nouveau module `src/lib/realtime.ts` : jeton transmis avant tout abonnement, **un canal par flux partagé** entre composants, fermeture différée. Les 4 composants temps réel l'utilisent.
- **Mise en page** : débordements horizontaux (jusqu'à 512 px sur l'accueil mobile, 15 px sur toutes les pages mobiles), colonne du fil coupée sur desktop, logo en double et compte à rebours sur deux lignes dans la barre mobile, filtres illisibles sur mobile (2 par ligne désormais), badges rognés dans le composeur d'échange, silhouette des cartes.
- **Achat** : l'acheteur voyait sa carte « Vendue » (événement Realtime plus rapide que la réponse) → « Achetée ! Voir ma collection ».
- **Connexion** : une limite de débit de l'authentification affichait « mot de passe incorrect » → message dédié.

### Accessibilité (WCAG 2.1 AA)
- Audit axe-core sur 20 pages : **0 violation** après corrections (contraste du texte discret porté à ≥ 4,5:1, couleurs d'avatar, badge de la cloche, noms accessibles cohérents avec le texte visible, barre de progression nommée, zone défilante accessible au clavier).
- Déjà en place : `lang="fr"`, focus visible, `prefers-reduced-motion` + réglage du profil, modales `<dialog>` (focus piégé, Échap), libellés de formulaires, `aria-live` pour les mises à jour en direct.

### Performances
- **Lecture paginée** (`src/lib/supabase/paginate.ts`) de toutes les lectures pouvant dépasser la limite PostgREST de 1 000 lignes (collection, statistiques, albums, échanges, doublons, vitrine). Vérifié avec un compte de **1 500 exemplaires** : tout est compté.
- Collection : exemplaires lus sans jointure + catalogue joint en mémoire ; la revente groupée reçoit un résumé par rareté au lieu de tous les exemplaires (634 → 508 Ko de HTML brut). En **production** (`next start`) : collection de 1 500 exemplaires en ~0,3 s, **32 Ko transférés** (gzip) ; accueil 26 Ko ; marché 25 Ko.
- Migration `20261112080000_performance.sql` : 22 index (clés étrangères parcourues par les suppressions en cascade, annonces par vendeur, éléments d'échange par exemplaire, échanges en attente par expiration…).

### États vides et erreurs
- `src/app/(jeu)/error.tsx` (« Faute ! », réessayer, référence de l'erreur) et `src/app/global-error.tsx` (document autonome aux couleurs du jeu).
- Parcours « nouveau joueur » réel : inscription (pseudo pris, mot interdit, e-mail existant), accueil vide, solde de bienvenue, 7 états vides, 404.

### Comment tester
- `npm test` (47 tests), `npm run test:db` (189), `npm run test:integration` (21).
- Parcours navigateur vérifiés : ouverture de booster sur mobile (révélation, tout révéler, récapitulatif, revente), menu « Plus », A met en vente / B achète via la modale → chez A, annonce « Vendue » + toast + cloche sans rechargement ; B compose un échange sur mobile → A le voit arriver en direct, l'accepte → B reçoit le toast.

### Limites connues
- Les scripts de vérification navigateur (Playwright) ont été exécutés hors du dépôt : ils ne font pas partie de `npm test`.
- Pas de graphique d'historique de prix (tableau + statistiques).
- Pas de journal d'audit des actions admin ; pas d'avatars téléversés (`avatar_url` prévu).

## Bilan
Les 9 phases de la spec sont livrées.

## Conventions techniques à retenir
- Toute nouvelle table : `enable row level security` + `revoke insert, update, delete … from anon, authenticated` (les privilèges par défaut de Supabase les accordent).
- Toute nouvelle fonction interne : `revoke execute … from public, anon, authenticated`.
- Après chaque migration : `npm run db:types`.
- Cache Components : les lectures Supabase passent par `createClient()` (qui appelle `connection()`) ; chaque route du jeu a son `loading.tsx`.
- Temps réel : toujours passer par `subscribeToChanges` (`src/lib/realtime.ts`), jamais `supabase.channel()` directement dans un composant.
- Lectures pouvant dépasser 1 000 lignes : `fetchAll` (`src/lib/supabase/paginate.ts`) avec un ordre stable.
- **Un layout n'est pas une frontière d'autorisation** (pages rendues en parallèle) : chaque page protégée appelle elle-même `requireProfile()` / `requireAdmin()`, et la base revérifie (RLS / RPC).

## Déploiement — CI/CD (2026-11-12)
- Pile de production auto-hébergée (`deploy/`) : Caddy (HTTPS automatique, site + API sur un seul domaine), Next.js standalone, PostgreSQL / GoTrue / PostgREST / Realtime de Supabase. **Testée localement de bout en bout** : 11 migrations + seed, parcours navigateur à deux joueurs en temps réel ; ~600 Mo de RAM.
- `.github/workflows/ci-cd.yml` : tests complets (Supabase réel dans la CI) à chaque push / PR ; sur `main`, image GHCR puis déploiement SSH sur le VPS (activé par la variable `SITE_HOST`).
- Mise en service et exploitation : `deploy/DEPLOIEMENT.md`.

## Photos, écussons et mercato 2026 (2026-11-12)

### Fait
- **Mercato** : club actuel de chaque joueur recoupé entre Wikidata (P54) et l'infobox Wikipédia. 26 transferts
  appliqués aux cartes « Saison 2026 » (Salah → Trabzonspor, Rodri → Barcelone, Konaté et Bernardo Silva → Real,
  Barcola → Liverpool…), 9 nouveaux clubs, parcours mis à jour, albums PSG / Real recalculés.
  Benzema, libre depuis le 31/08/2026, reste rattaché à son dernier club (Al-Hilal).
- **Photos** : 147 photos libres de Wikimedia Commons, détourées et recadrées en buste façon carte de foot
  (`public/media/players`). Carte redessinée : joueur détouré sur un halo aux couleurs du club, colonne
  note / poste / drapeau / écusson.
- **Écussons** : logos des 48 clubs (fichiers Wikipédia, `public/media/clubs`), avec repli sur l'écusson généré.
- **Drapeaux** : vrais drapeaux SVG (paquet flag-icons, MIT) dans `public/media/flags`, repli stylisé.
  Nationalités sportives recoupées avec Wikidata (P1532) : Aubameyang corrigé (Gabon, pas France),
  migration `20261112100000_nations_fix.sql` (retire aussi sa carte de l'album Équipe de France).
- **Crédits** : page `/credits` (auteur, licence, source de chaque photo ; mention des marques des clubs),
  liée depuis le wiki. Photo et écussons du parcours sur la fiche joueur du wiki.
- Migration `20261112090000_transfers_media.sql` : met à jour une base déjà peuplée (production) ; sur une base vide,
  le seed contient directement ces données. Chaîne d'outils reproductible dans `scripts/media/` (voir son README).

### Comment tester
- `supabase db reset`, puis `/collection`, `/wiki/mbappe`, `/albums/real-madrid` et `/credits`.

### Limites connues
- Quelques photos sources sont modestes (Mitoma flou, Yıldız en pleine action) : à remplacer via `overrides.json`.
- Les logos de clubs sont des marques déposées (choix assumé, cf. CLAUDE.md règle 6).
- Le mercato évolue : relancer `scripts/media/wikidata.mjs` et `infobox.mjs` pour comparer à nouveau.

## Connexion Discord uniquement (2026-11-12)

### Fait
- Bouton « Se connecter avec Discord » (OAuth PKCE) → retour `/auth/callback` → session. Première connexion : profil créé
  automatiquement, pseudo tiré de Discord (nom affiché, identifiant, puis e-mail), nettoyé, rendu unique, jamais de mot
  interdit, modifiable dans `/profil` (migration `20261112110000_discord_auth.sql`, tests pgTAP `09_discord`).
- Production : fournisseur e-mail **fermé côté GoTrue** (pas seulement masqué), `/inscription` redirige vers `/connexion`.
- Local / CI : `AUTH_EMAIL_LOGIN=true` garde la connexion e-mail pour les comptes de test (bloc « comptes de test »).
- Déploiement : `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` dans `deploy/.env` (le pipeline refuse de déployer sans).

### Comment tester
- Local : `/connexion` montre Discord + comptes de test. Discord en local : voir le bloc `[auth.external.discord]` de `supabase/config.toml`.
- Annulation côté Discord → message « Connexion annulée », code invalide → message d'échec.

### Limites connues
- Les comptes de démo restent en base (classements, marché) mais ne peuvent plus se connecter en production.
