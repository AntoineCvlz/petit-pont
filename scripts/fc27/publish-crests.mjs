// Publie les écussons téléchargés par crests.mjs : public/media/clubs/<code>.webp (160 px) + crédits (/credits).
// Codes à écarter après vérification visuelle : passés en arguments (fichier et crédit retirés).
// Usage : node scripts/fc27/publish-crests.mjs [CODE_A_ECARTER …]
// Puis regénérer le SQL (build-sql.mjs) : il renseigne crest_url pour les fichiers présents.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const rejected = new Set(process.argv.slice(2));
const sources = JSON.parse(readFileSync(`${dir}out/crest-sources.json`, "utf8"));
const creditsFile = `${root}src/lib/media-credits.json`;
const credits = JSON.parse(readFileSync(creditsFile, "utf8"));
const byCode = new Map(credits.clubs.map((c) => [c.code, c]));

let published = 0;
for (const [code, src] of Object.entries(sources)) {
  const out = `${root}public/media/clubs/${code}.webp`;
  if (rejected.has(code)) {
    rmSync(out, { force: true });
    byCode.delete(code);
    continue;
  }
  const raw = `${root}scripts/media/raw/clubs/${code}.png`;
  if (!existsSync(raw)) continue;
  try {
    await sharp(raw)
      .resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(out);
  } catch {
    console.warn(`Image illisible : ${code}`);
    continue;
  }
  byCode.set(code, { code, name: src.name, source: src.file ?? src.page });
  published++;
}
credits.clubs = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
writeFileSync(creditsFile, `${JSON.stringify(credits, null, 2)}\n`);
console.log(`${published} écussons publiés (${credits.clubs.length} au total)`);
