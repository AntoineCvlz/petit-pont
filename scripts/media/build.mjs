// Assemble les médias publiés :
//   - photos détourées (dossier passé en argument, produit par cutout.mjs) → public/media/players/<slug>.webp
//   - écussons (scripts/media/raw/clubs) → public/media/clubs/<code>.webp (160 px)
//   - crédits → src/lib/media-credits.json (page /credits)
// Usage : node scripts/media/build.mjs <dossier des photos détourées>
// Nécessite sharp (dépendance de Next.js).
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const cutDir = process.argv[2];
if (!cutDir || !existsSync(cutDir)) {
  console.error("Usage : node scripts/media/build.mjs <dossier des photos détourées>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(`${dir}wikidata.json`, "utf8"));
const sources = JSON.parse(readFileSync(`${dir}sources.json`, "utf8"));
const overrides = existsSync(`${dir}overrides.json`) ? JSON.parse(readFileSync(`${dir}overrides.json`, "utf8")) : {};

mkdirSync(`${root}public/media/players`, { recursive: true });
mkdirSync(`${root}public/media/clubs`, { recursive: true });

const credits = { players: [], clubs: [] };
for (const file of readdirSync(cutDir).filter((f) => f.endsWith(".webp")).sort()) {
  const slug = file.slice(0, -5);
  const src = overrides.players?.[slug] ?? sources.players[slug];
  if (!src || !data.players[slug]) continue;
  copyFileSync(`${cutDir}/${file}`, `${root}public/media/players/${file}`);
  credits.players.push({
    slug, name: data.players[slug].name,
    author: /unknown author/i.test(src.author) ? "Auteur inconnu" : src.author.replace(/\s*Author:\s*$/, ""),
    license: src.license, licenseUrl: src.licenseUrl,
    source: src.page,
  });
}
for (const [code, src] of Object.entries(sources.clubs).sort()) {
  await sharp(`${dir}raw/clubs/${code}.png`)
    .resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`${root}public/media/clubs/${code}.webp`);
  credits.clubs.push({ code, name: data.clubs[code].name, source: src.page });
}
writeFileSync(`${root}src/lib/media-credits.json`, `${JSON.stringify(credits, null, 2)}\n`);
console.log(`${credits.players.length} photos, ${credits.clubs.length} écussons`);
