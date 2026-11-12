# CLAUDE.md — Petit Pont

## Contexte
**Petit Pont** : jeu web **multijoueur** de collection de cartes de football (boosters, albums, marché entre joueurs, échanges, classements, fil d'activité).
La spécification complète est dans `SPEC.md`. Lis-la avant toute nouvelle phase.
L'avancement est suivi dans `PROGRESS.md` (à créer et tenir à jour).

## Stack
- Next.js (App Router) + TypeScript strict
- Tailwind CSS, Framer Motion
- Supabase (Auth, PostgreSQL, Storage) — en local via Supabase CLI (Docker)
- Tests : Vitest (unitaires) + tests SQL/intégration sur les fonctions Postgres

## Commandes
- `npm run dev` — serveur de développement
- `npm run build` — build de production (doit passer avant de clore une phase)
- `npm run lint` et `npm run typecheck`
- `npm test`
- `supabase start` / `supabase stop`
- `supabase db reset` — réapplique migrations + seed
- `supabase gen types typescript --local > src/types/database.ts` — après chaque migration

## Règles non négociables
1. **Aucune fausse fonctionnalité.** Tout bouton affiché déclenche une vraie action persistée. Si ce n'est pas prêt, ne l'affiche pas. Pas de données mockées dans les composants.
2. **Logique sensible côté serveur uniquement** : ouverture de booster, achat, vente, échange, revente, récompenses. Fonctions Postgres `SECURITY DEFINER` appelées en RPC, dans une transaction, avec `SELECT ... FOR UPDATE` sur les lignes concernées. Le client ne choisit jamais les cartes ni les montants.
3. **RLS activée sur toutes les tables.** Un utilisateur ne modifie jamais directement les tables sensibles (card_instances, coin_transactions, trades…) : uniquement via les RPC.
4. **Monnaie virtuelle uniquement** (pièces). Aucun paiement en argent réel, aucune conversion.
5. **Toute modification de schéma = nouvelle migration** dans `supabase/migrations/`. Ne jamais modifier une migration déjà appliquée.
6. **Images** (décision du porteur du projet, nov. 2026) :
   - Photos de joueurs : **uniquement sous licence libre** (Wikimedia Commons), détourées via `scripts/media/`, créditées sur `/credits`. Jamais d'images FUT, Flashscore ou autre site.
   - Écussons : logos des clubs (fichiers Wikipédia), marques de leurs clubs, mentionnées sur `/credits`.
   - Sans image, repli sur la silhouette / l'écusson génériques ; `image_url` et `crest_url` restent remplaçables.
7. Ne copie aucun élément graphique, texte ou code de kyara.games ni d'un autre site.
8. **Toujours penser multijoueur.** Chaque fonctionnalité qui implique deux joueurs (achat, vente, échange, notification) se teste avec deux comptes distincts, y compris le cas où les deux agissent en même temps.
9. Les événements publics (fil d'activité, notifications) sont créés par les RPC côté serveur, jamais par le client.

## Conventions
- Composants UI réutilisables dans `src/components/ui/` (Card, Button, Modal, FilterBar, RarityBadge…).
- Accès aux données dans `src/lib/` ; pas d'appels Supabase dispersés dans les composants.
- Textes de l'interface en français.
- Animations < 400 ms (sauf ouverture de booster), respect de `prefers-reduced-motion`.

## Comptes de test
Connexion **Discord uniquement** en production. En local, `AUTH_EMAIL_LOGIN=true` (`.env.local`) réactive la connexion
e-mail pour les comptes de test (indispensable pour tester à deux comptes).
Le seed crée des comptes de démo (`is_demo = true`). Documente dans `PROGRESS.md` au moins deux identifiants de test (ex. joueur A et joueur B) pour vérifier les interactions entre joueurs.

## Fin de chaque phase
1. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` passent.
2. `supabase db reset` fonctionne de zéro.
3. Vérifie le parcours dans le navigateur (desktop et largeur mobile), et avec deux comptes dans deux fenêtres (dont une privée) pour toute fonctionnalité multijoueur.
4. Mets à jour `PROGRESS.md` : ce qui est fait, comment le tester, limites connues.
5. Commit avec un message clair (`feat(phase-N): ...`).
