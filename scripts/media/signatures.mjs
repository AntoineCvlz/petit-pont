// Signatures réelles des joueurs (Wikimedia Commons, domaine public — propriété Wikidata P109) pour l'édition
// « Signature ». Jamais d'imitation : uniquement les fichiers existants. Tracé converti en blanc sur fond transparent
// (public/media/signatures/<slug>.png), teinté en CSS sur la carte.
//   node scripts/media/signatures.mjs
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const raw = `${root}scripts/media/raw/signatures/`;
const out = `${root}public/media/signatures/`;
mkdirSync(raw, { recursive: true });
mkdirSync(out, { recursive: true });
const UA = "petit-pont-media-script/1.0 (outil de developpement)";

export const SIGNATURES = {
  pele: "Firma de Pelé.svg",
  maradona: "Maradona firma.svg",
  messi: "Firma de Lionel Messi.svg",
  "cristiano-ronaldo": "Cristiano Ronaldo Signature.svg",
  ronaldinho: "Ronaldinho Signature.png",
  mbappe: "Kylian Mbappé sig.svg",
  dembele: "Ousmane Dembele Signature.svg",
};

for (const [slug, file] of Object.entries(SIGNATURES)) {
  const src = `${raw}${slug}.png`;
  if (!existsSync(src)) {
    // Miniature PNG (le serveur des originaux limite fortement le débit)
    const res = await fetch(
      `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file.replace(/ /g, "_"))}?width=900`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) throw new Error(`${file} : ${res.status}`);
    writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    await new Promise((r) => setTimeout(r, 1500));
  }
  // Encre = pixels sombres ou opaques : opacité = encre, couleur blanche
  const { data, info } = await sharp(src).flatten({ background: "#ffffff" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.alloc(info.width * info.height * 4, 255);
  for (let i = 0; i < info.width * info.height; i++) px[i * 4 + 3] = Math.max(0, Math.min(255, (235 - data[i]) * 1.6));
  await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize(600, 260, { fit: "inside" })
    .png({ compressionLevel: 9 })
    .toFile(`${out}${slug}.png`);
  console.log(`${slug} ✓`);
}
