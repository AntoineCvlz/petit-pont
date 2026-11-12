# Petit Pont

Jeu web multijoueur de collection de cartes de football : boosters, albums, marché entre joueurs, échanges, classements.

- Spécification : [`SPEC.md`](SPEC.md)
- Avancement, comptes de test et démarrage local : [`PROGRESS.md`](PROGRESS.md)
- Règles de développement : [`CLAUDE.md`](CLAUDE.md)

```bash
npm install
npx supabase start
cp .env.example .env.local   # clé « Publishable » : npx supabase status
npx supabase db reset
npm run dev
```
