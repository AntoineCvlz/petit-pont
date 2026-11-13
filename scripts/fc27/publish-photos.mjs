// Publie les photos détourées du catalogue importé : public/media/players/fc<id>.webp + crédits (/credits).
// Seules les photos libres listées dans scripts/fc27/out/photo-sources.json sont reprises.
// Usage : node scripts/fc27/publish-photos.mjs <dossier des photos détourées>
// Puis regénérer le SQL (build-sql.mjs) : il renseigne image_url pour les fichiers présents.
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const cutDir = process.argv[2];
if (!cutDir || !existsSync(cutDir)) {
  console.error("Usage : node scripts/fc27/publish-photos.mjs <dossier des photos détourées>");
  process.exit(1);
}
const sources = JSON.parse(readFileSync(`${dir}out/photo-sources.json`, "utf8"));
const creditsFile = `${root}src/lib/media-credits.json`;
const credits = JSON.parse(readFileSync(creditsFile, "utf8"));
const bySlug = new Map(credits.players.map((p) => [p.slug, p]));

let added = 0;
for (const file of readdirSync(cutDir).filter((f) => /^fc\d+\.webp$/.test(f))) {
  const id = file.slice(2, -5);
  const src = sources[id];
  if (!src) continue;
  copyFileSync(`${cutDir}/${file}`, `${root}public/media/players/${file}`);
  if (!bySlug.has(src.slug)) added++;
  bySlug.set(src.slug, {
    slug: src.slug,
    name: src.name,
    author: /unknown author/i.test(src.author) ? "Auteur inconnu" : src.author.replace(/\s*Author:\s*$/, "").slice(0, 200),
    license: src.license,
    licenseUrl: src.licenseUrl,
    source: src.page,
  });
}
credits.players = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
writeFileSync(creditsFile, `${JSON.stringify(credits, null, 2)}\n`);
console.log(`${added} nouvelles photos publiées (${credits.players.length} au total)`);
