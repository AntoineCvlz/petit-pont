# SPEC — Petit Pont

Nom du jeu : **Petit Pont** (à utiliser dans le logo, le titre des pages et les textes).

## Objectif
Jeu de collection de cartes de football **multijoueur** jouable dans le navigateur. Les joueurs collectionnent, mais surtout interagissent entre eux : ils s'achètent des cartes, s'échangent des doublons, se comparent dans les classements et suivent l'activité de la communauté. Fonctions : boosters, collection, albums, marché entre joueurs, échanges, classements, fil d'activité, wiki.

Inspiration d'expérience : les jeux de collection communautaires comme kyara.games (interface dense, navigation compacte, cartes au centre). Design, logo et visuels 100 % originaux.

Ce n'est PAS : un site vitrine, une boutique e-commerce, un clone de FIFA Ultimate Team (pas de matchs, d'équipes, de gameplay), ni un design de casino.

## 1. Direction artistique
- Thème sombre et élégant (anthracite / vert très foncé, ambiance pelouse de nuit). Couleurs vives réservées aux raretés.
- Interface « application de jeu » dense : barre de navigation compacte, panneaux, filtres, modales, tooltips. Pas de hero ni de sections marketing.
- Design system cohérent et réutilisable.
- Responsive : sur mobile, barre de navigation inférieure (5 entrées + menu « Plus »).
- Animations rapides et fluides, pas de 3D inutile.
- Logo original « Petit Pont » et identité footballistique (typographie sportive, motifs de terrain, filets). Piste pour le logo : un ballon qui passe sous une arche (le geste du petit pont), lisible en petit format (favicon, barre mobile).
- Ton des textes : complice et footballistique (ex. « Petit pont réussi ! » à l'obtention d'une carte rare, « Raté, c'est un doublon »).

## 2. Navigation
Accueil · Boosters · Collection · Albums · Marché · Échanges · Classement · Wiki des joueurs · Profil

Barre supérieure : solde de pièces, compte à rebours du booster gratuit, notifications (échanges reçus, ventes), avatar.

Accueil : booster gratuit disponible, progression des albums en cours, dernières cartes obtenues, fil d'activité de la communauté, activité récente du marché, échanges en attente.

## 3. Cartes
- **card_template** : un joueur dans une version (ex. « Joueur X – Saison 2026 – Rare »).
- **card_instance** : exemplaire possédé, avec numéro de série unique.

Contenu : visuel, nom, drapeau, club, poste, note (40-99), rareté, numéro de collection (ex. 042/250), numéro de série pour les raretés limitées.

Raretés : Commune · Rare · Épique · Légendaire · Iconique · Spéciale.
- Cadre, couleur et effet propres à chaque rareté.
- Brillance discrète à partir de Rare.
- Spéciale : effet holographique animé en CSS (survol / inclinaison).

Visuels : portraits illustrés ou silhouettes stylisées en placeholder, écussons génériques, `image_url` remplaçable.

Seed de démonstration : ≥ 120 cartes réparties sur toutes les raretés, incluant Mbappé, Messi, Cristiano Ronaldo, Neymar, Haaland, Lamine Yamal, Dembélé, Vinícius Jr, Zidane, Ronaldinho. Joueurs = données, jamais codés en dur.

## 4. Économie
- Monnaie virtuelle : pièces. Pas d'argent réel.
- Gains : bonus de connexion quotidien, revente de doublons au système (prix par rareté), ventes sur le marché, complétion d'albums.
- Solde de départ configurable (ex. 1 000 pièces).
- Table `coin_transactions` : journal immuable de tous les mouvements ; le solde doit toujours correspondre au journal.

## 5. Boosters
Types :
- Gratuit : 1 toutes les X heures (configurable), compte à rebours.
- Standard, Premium : payés en pièces.
- Événementiel : entre deux dates.
- Compétition limitée : stock total limité, compteur restant.

Fiche : illustration, prix, nombre de cartes, liste des cartes possibles, probabilités par rareté affichées, garanties (ex. « au moins 1 Rare »).

Ouverture :
1. RPC `open_booster(booster_id)` atomique : vérifie solde / cooldown / stock / dates, débite, tire les cartes, crée les exemplaires, journalise, renvoie le résultat.
2. Tirage côté serveur selon `booster_odds` en base.
3. Animation : booster qui se déchire, cartes face cachée, révélation une par une ou « tout révéler », mise en avant des hautes raretés, son optionnel désactivable.
4. Récapitulatif : badges « NOUVEAU » / « DOUBLON », bouton « revendre les doublons ».

## 6. Collection et albums
Collection : grille filtrable / triable (rareté, club, nation, poste, note, date), recherche, compteur d'exemplaires, vue détail avec exemplaires et historique.

Albums (configurables via `albums`, `album_slots`) : par compétition, club, sélection, saison, Légendes.
- Emplacements numérotés ; possédé = en couleur ; manquant = grisé avec numéro, rareté, silhouette.
- Barre de progression (%) et récompense en pièces à la complétion (une seule fois).

## 7. Marché
- Mise en vente à prix fixe ; exemplaire verrouillé pendant la vente ; annulation possible.
- Achat via RPC atomique : solde, transfert de l'exemplaire et des pièces, commission configurable (5 %), journalisation. Gérer deux acheteurs simultanés.
- Recherche joueur ; filtres rareté, club, nation, prix ; tris prix / date.
- Onglets : dernières ventes, cartes les plus recherchées (recherches + listes de souhaits), historique de prix par carte.

## 8. Échanges
- Profil public et collection des autres joueurs.
- Proposition : mes exemplaires + ceux de l'autre + pièces optionnelles.
- Accepter, refuser, contre-proposer.
- Acceptation via RPC : revérifie la propriété et l'absence de mise en vente de chaque exemplaire, puis échange atomique.
- Expiration automatique après 7 jours.
- Historique (envoyés, reçus, terminés). Liste de souhaits visible sur le profil.

## 9. Classements
Progression globale (%), nombre de cartes, albums complétés, score de rareté pondéré, boosters ouverts.
Filtres semaine / mois / tout temps. Position de l'utilisateur toujours visible.
Vues SQL ou vues matérialisées rafraîchies périodiquement.

## 10. Wiki des joueurs
Fiche : biographie courte, nation, clubs, poste, toutes les versions de cartes avec rareté, nombre en circulation, prix moyen au marché.

## 11. Profil
Avatar, pseudo, inscription, statistiques, 5 cartes vitrines, liste de souhaits, historique des pièces, paramètres (sons, animations réduites).

## 12. Communauté et multijoueur
### Temps réel (Supabase Realtime)
- Proposition d'échange reçue, échange accepté/refusé, carte vendue : notification instantanée sans rechargement.
- Marché : une annonce vendue disparaît en direct chez tous les visiteurs.
- Compteurs de stock des boosters limités mis à jour en direct.

### Notifications
Table `notifications` (type, contenu, lien, lu/non lu). Cloche dans la barre supérieure avec compteur, page listant l'historique, « tout marquer comme lu ».

### Fil d'activité
Table `activity_feed` alimentée par les RPC (jamais par le client). Événements publics :
- obtention d'une carte Légendaire, Iconique ou Spéciale ;
- album complété ;
- vente importante sur le marché ;
- entrée dans le top 10 d'un classement.
Affiché sur l'accueil, chaque entrée renvoie vers le profil du joueur ou la carte. Option de profil pour masquer son activité.

### Découverte des autres joueurs
- Recherche de joueurs par pseudo.
- Profil public : statistiques, cartes vitrines, albums, liste de souhaits, doublons disponibles à l'échange, bouton « Proposer un échange ».
- Suggestions : « Ces joueurs ont des cartes de ta liste de souhaits » (croisement doublons / souhaits).

### Joueurs de démonstration
Le seed crée au moins 10 comptes fictifs avec des pseudos, des collections variées, des annonces sur le marché, des propositions d'échange en attente vers le premier vrai compte, et un historique d'activité. Le jeu ne doit jamais paraître vide en test. Ces comptes sont marqués `is_demo = true` et supprimables d'un clic depuis l'admin.

### Modération minimale
Pseudos uniques, filtrés (liste de mots interdits), signalement d'un profil, blocage d'un joueur (il ne peut plus proposer d'échange).

## 13. Administration (`/admin`, rôle admin)
CRUD joueurs, cartes, albums, boosters ; édition des probabilités (total = 100 % validé) ; stocks et dates des événements ; statistiques de l'économie ; gestion des signalements ; suppression des comptes de démo.

## 14. Données
Tables minimales : profiles, players, clubs, nations, card_templates, card_instances, boosters, booster_odds, booster_openings, albums, album_slots, market_listings, market_sales, trades, trade_items, wishlists, coin_transactions, notifications, activity_feed, reports, blocks.

## 15. Phases
1. Fondations : projet, Supabase local, auth, schéma, seed (cartes + joueurs de démo), layout, navigation, design system des cartes.
2. Boosters : boutique, RPC d'ouverture, animation, ajout à la collection.
3. Collection et albums.
4. Économie : solde, journal, revente, bonus quotidien.
5. Marché.
6. Échanges.
7. Communauté : profils publics, recherche de joueurs, notifications et temps réel, fil d'activité, classements, wiki.
8. Administration et modération.
9. Finitions : responsive, performances, accessibilité, états vides et erreurs.
