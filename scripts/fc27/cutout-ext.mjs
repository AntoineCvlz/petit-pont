// Détourage des portraits API-Football (fond blanc retiré) avec le même modèle que scripts/media/cutout.mjs.
// Dépendance lourde hors projet : à exécuter depuis le dossier où @imgly/background-removal-node et sharp sont installés :
//   node cutout-ext.mjs <projet>/scripts/fc27/out [ids…]
// Les originaux sont conservés dans out/apifootball/orig/ ; les fichiers de out/media-ext/players/ sont remplacés
// (même nom, même URL : aucune mise à jour de base nécessaire). Déjà détourés : ignorés.
import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";

const [, , out, ...only] = process.argv;
const photos = `${out}/media-ext/players`;
const orig = `${out}/apifootball/orig`;
mkdirSync(orig, { recursive: true });
const files = only.length ? only.map((id) => `${id}.webp`) : readdirSync(photos).filter((f) => f.endsWith(".webp"));
let done = 0;
for (const file of files) {
  if (!only.length && existsSync(`${orig}/${file}`)) continue;
  if (!existsSync(`${orig}/${file}`)) copyFileSync(`${photos}/${file}`, `${orig}/${file}`);
  try {
    const input = await sharp(`${orig}/${file}`).resize(480, 480).png().toBuffer();
    const blob = await removeBackground(new Blob([input], { type: "image/png" }), {
      model: "medium",
      output: { format: "image/png" },
    });
    await sharp(Buffer.from(await blob.arrayBuffer()))
      .trim({ threshold: 1 })
      .resize(360, 360, { fit: "inside" })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(`${photos}/${file}`);
    done++;
    if (done % 50 === 0) console.log(`${done} détourées`);
  } catch (e) {
    console.warn(`Échec ${file} : ${e.message}`);
  }
}
console.log(`Terminé : ${done} portraits détourés`);
