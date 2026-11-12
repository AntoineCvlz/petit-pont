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
- Navigation volontairement réduite à Accueil · Collection · Wiki · Profil : Boosters, Albums, Marché, Échanges et Classement n'apparaîtront qu'avec leur phase (règle « aucune fausse fonctionnalité »). Idem pour le compte à rebours du booster gratuit et la cloche de notifications.
- Les annonces du marché seedées existent en base mais ne sont pas encore affichées (phase 5).
- Les propositions d'échange des comptes démo vers « le premier vrai compte » seront créées en phase 6 (trigger à l'inscription).
- Pas de filtres/tri dans la collection (phase 3). Pas d'avatars uploadés (Storage plus tard).
- Données joueurs illustratives : effectifs « Saison 2026 » et notes fictives.
- Vérification visuelle automatisée dans un navigateur non faite (outil navigateur indisponible pendant la session) : rendu des pages, redirections et sessions vérifiés par un test HTTP de bout en bout avec deux comptes.

## Phases suivantes
2. Boosters · 3. Collection et albums · 4. Économie · 5. Marché · 6. Échanges · 7. Communauté · 8. Administration · 9. Finitions

## Conventions techniques à retenir
- Toute nouvelle table : `enable row level security` + `revoke insert, update, delete … from anon, authenticated` (les privilèges par défaut de Supabase les accordent).
- Toute nouvelle fonction interne : `revoke execute … from public, anon, authenticated`.
- Après chaque migration : `npm run db:types`.
- Cache Components : les lectures Supabase passent par `createClient()` (qui appelle `connection()`) ; chaque route du jeu a son `loading.tsx`.
