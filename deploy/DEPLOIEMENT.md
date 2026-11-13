# Déploiement — https://petit-pont.antoine-cuvilliez.fr

VPS IONOS 2 vCPU / 2 Go, Ubuntu, Docker. Tout est auto-hébergé ; pile testée localement de bout en bout
(migrations, seed, parcours navigateur à deux joueurs en temps réel) : **~600 Mo de RAM** au total.

## Architecture
| Service | Image | Rôle |
|---|---|---|
| `caddy` | `caddy:2.10-alpine` | Ports 80/443, HTTPS Let's Encrypt automatique, routage : `/auth/v1` → auth, `/rest/v1` → rest, `/realtime/v1` → realtime, le reste → app |
| `app` | `ghcr.io/antoinecvlz/petit-pont` | Site Next.js (construit par GitHub Actions) |
| `db` | `supabase/postgres:17.11.0.018` | PostgreSQL (port non exposé) |
| `auth` | `supabase/gotrue:v2.197.0` | Comptes joueurs |
| `rest` | `supabase/postgrest:v16.5` | API (RLS) |
| `realtime` | `supabase/realtime:v2.154.0` | Temps réel |

Jetons : HS256 avec un secret partagé ; clés `anon` / `service_role` générées par `scripts/generate-secrets.mjs`.
Les migrations sont appliquées par `scripts/migrate.sh` (rôle `postgres`, table compatible CLI) ; le seed
(démos inclus) n'est chargé que si le catalogue est vide.

## Pipeline (`.github/workflows/ci-cd.yml`)
- **Tests** à chaque push / PR : Supabase réel dans la CI, lint, typecheck, unitaires, pgTAP, intégration, build.
- Sur `main`, si les tests passent **et** que la variable `SITE_HOST` existe : **image** → GHCR, puis **déploiement**
  SSH (copie de la config + migrations, `docker compose pull/up`, migrations), puis vérification HTTPS.

## Mise en service (une seule fois)

### 1. Sur le VPS (en root, après la réinstallation)
```bash
# Docker (si l'image IONOS ne l'inclut pas)
docker --version || (curl -fsSL https://get.docker.com | sh)

# Swap de 2 Go (filet de sécurité)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Utilisateur de déploiement
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/petit-pont/deploy /home/deploy/.ssh
chown -R deploy:deploy /opt/petit-pont /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
```

### 2. Sur ton PC (PowerShell, à la racine du projet)
```powershell
# Clé SSH dédiée à GitHub Actions
ssh-keygen -t ed25519 -f $HOME\.ssh\petit-pont-deploy -C github-actions -N '""'

# Autoriser cette clé pour l'utilisateur deploy
type $HOME\.ssh\petit-pont-deploy.pub | ssh root@IP_DU_VPS "cat >> /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys"

# Secrets de production (déjà générés dans deploy/.env) → VPS
scp deploy\.env root@IP_DU_VPS:/opt/petit-pont/deploy/.env
ssh root@IP_DU_VPS "chown deploy:deploy /opt/petit-pont/deploy/.env && chmod 600 /opt/petit-pont/deploy/.env"

# Empreinte du serveur (pour le secret VPS_KNOWN_HOSTS)
ssh-keyscan IP_DU_VPS
```
Garde une copie de `deploy/.env` en lieu sûr (gestionnaire de mots de passe) : sans lui, plus d'accès à la base.

### 3. Pare-feu IONOS
Panneau IONOS → Serveurs & Cloud → Réseau → Stratégies de pare-feu : autoriser **22, 80, 443** (TCP) et **443 UDP**.

### 4. GitHub (dépôt → Settings → Secrets and variables → Actions)
| Type | Nom | Valeur |
|---|---|---|
| Secret | `VPS_HOST` | IP du VPS |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | contenu de `~/.ssh/petit-pont-deploy` (clé **privée**) |
| Secret | `VPS_KNOWN_HOSTS` | sortie de `ssh-keyscan IP_DU_VPS` |
| Secret | `ANON_KEY` | valeur `ANON_KEY=` de `deploy/.env` |
| Variable | `SITE_HOST` | `petit-pont.antoine-cuvilliez.fr` |

### 4 bis. Connexion Discord (obligatoire : seul mode de connexion en production)
1. https://discord.com/developers/applications → **New Application** (nom : Petit Pont).
2. **OAuth2** → **Redirects** → ajouter `https://petit-pont.antoine-cuvilliez.fr/auth/v1/callback`.
3. Copier le **Client ID** et le **Client Secret** (Reset Secret) dans `/opt/petit-pont/deploy/.env` sur le VPS :
   ```
   DISCORD_CLIENT_ID=...
   DISCORD_CLIENT_SECRET=...
   ```
Le déploiement s'arrête (sans toucher aux conteneurs) si ces deux valeurs manquent.

### 4 ter. Discord : annonces et commande /carte (facultatif)
- **Annonces dans un salon** : Discord → paramètres du salon → Intégrations → Webhooks → Nouveau → Copier l'URL,
  puis sur le site : Admin → Tableau de bord → « Annonces Discord » (URL du webhook + URL du site).
- **Commande `/carte`** (même application Discord que la connexion) :
  1. Portail développeur → ton application → *General Information* : copier la **Public Key** dans `deploy/.env` :
     `DISCORD_PUBLIC_KEY=...` (sur le VPS), puis redéployer.
  2. *General Information* → **Interactions Endpoint URL** : `https://petit-pont.antoine-cuvilliez.fr/api/discord/interactions`.
  3. *Bot* → **Reset Token** (le jeton ne sert qu'une fois, sur ton PC), puis enregistrer la commande :
     `$env:DISCORD_APP_ID="<Application ID>"; $env:DISCORD_BOT_TOKEN="<jeton>"; node scripts/discord/register-commands.mjs`
  4. *Installation* → lien d'installation **Guild Install** (scope `applications.commands`) → l'ajouter à ton serveur.

### 5. Lancer le premier déploiement
GitHub → Actions → **CI/CD** → *Run workflow* sur `main` (ou un push sur `main`). Durée : ~10 min.
Le premier déploiement initialise la base, applique les migrations, charge le seed, et Caddy obtient le certificat.

## Exploitation
```bash
cd /opt/petit-pont/deploy
docker compose ps                    # état des services
docker compose logs -f app caddy     # journaux
docker stats --no-stream             # mémoire
# Sauvegarde de la base
docker compose exec -T db pg_dump -U postgres -d postgres -Fc > ~/petit-pont-$(date +%F).dump
```
- Connexion **Discord uniquement** (fournisseur e-mail fermé côté GoTrue) : les comptes de démo ne peuvent plus se connecter.
- Admin : se connecter une première fois avec Discord, puis
  `docker compose exec db psql -U postgres -c "update public.profiles set is_admin = (username = 'TonPseudo') where is_admin or username = 'TonPseudo';"`.
- Les comptes de démo se suppriment d'un clic depuis `/admin`.
