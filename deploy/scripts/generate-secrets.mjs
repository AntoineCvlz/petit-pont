// Génère deploy/.env pour la production (à exécuter une seule fois, puis copier sur le VPS).
// Usage : node deploy/scripts/generate-secrets.mjs petit-pont.antoine-cuvilliez.fr [ghcr.io/proprietaire/petit-pont:latest]
// Ne jamais commiter le fichier produit.
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const host = process.argv[2];
const image = process.argv[3] ?? "ghcr.io/antoinecvlz/petit-pont:latest";
if (!host || host.includes("/")) {
  console.error("Usage : node deploy/scripts/generate-secrets.mjs <domaine> [image]");
  process.exit(1);
}
const out = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(out) && !process.argv.includes("--force")) {
  console.error(`${out} existe déjà : relance avec --force pour l'écraser (les anciennes clés seront invalidées).`);
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const secret = (bytes) => randomBytes(bytes).toString("base64url");

/** JWT HS256 signé avec le secret partagé (clés anon / service_role de Supabase). */
function jwt(payload, key) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", key).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

const JWT_SECRET = secret(48);
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 3600; // 10 ans
const ANON_KEY = jwt({ role: "anon", iss: "supabase", iat, exp }, JWT_SECRET);
const SERVICE_ROLE_KEY = jwt({ role: "service_role", iss: "supabase", iat, exp }, JWT_SECRET);

const env = `# Petit Pont — secrets de production (générés le ${new Date().toISOString()})
# NE PAS COMMITER. À placer dans /opt/petit-pont/deploy/.env sur le VPS.

SITE_HOST=${host}
SITE_URL=https://${host}
SITE_ADDRESS=${host}
APP_IMAGE=${image}

POSTGRES_PASSWORD=${secret(32)}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=3600
REALTIME_DB_ENC_KEY=${randomBytes(8).toString("hex")}
SECRET_KEY_BASE=${secret(48)}

# Application Discord (https://discord.com/developers/applications → OAuth2) : connexion des joueurs
# Redirect : https://${host}/auth/v1/callback
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Clé publique (aussi à mettre dans le secret GitHub ANON_KEY, injectée au build du site)
ANON_KEY=${ANON_KEY}
# Clé administrateur : contourne la RLS. Ne jamais l'exposer au navigateur ni dans GitHub.
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
`;
writeFileSync(out, env, { mode: 0o600 });
console.log(`Écrit : ${out}`);
console.log("\nÀ copier dans le secret GitHub ANON_KEY :\n" + ANON_KEY);
