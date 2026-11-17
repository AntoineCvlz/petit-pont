// Logos des championnats → silhouettes monochromes (public/media/leagues/<CODE>.png) pour l'habillage des boosters.
// Sources (Wikipédia, infobox de chaque championnat) téléchargées dans scripts/media/raw/leagues/ (non versionné) :
//   L1.png  « Logo Ligue 1 McDonald's 2024.svg »   PL.svg  « Premier League Logo.svg »
//   LL.svg  « LaLiga EA Sports 2023 Vertical Logo.svg »   SA.png  « Serie A ENILIVE logo.svg »
//   BL.svg  « Bundesliga logo (2017).svg »          SPL.svg « Roshn Saudi League Logo.svg »
//   UCL.png « UEFA Champions League.svg »  UEL.png « UEFA Europa League logo (2024 version).svg »
//   UECL.png « UEFA Conference League full logo (2024 version).svg »
// La forme vient de l'opacité du logo (blanc pur, recoloré en CSS par masque) ; les mentions de sponsors sont recadrées.
//   node scripts/media/league-logos.mjs
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const raw = `${root}scripts/media/raw/leagues/`;
const out = `${root}public/media/leagues/`;
mkdirSync(out, { recursive: true });

/** Recadrage (fractions de la hauteur/largeur, après suppression des marges) et règle d'opacité par logo. */
const RULES = {
  L1: { crop: [0, 0, 1, 0.72] }, // sans le logo du sponsor
  PL: {},
  LL: { crop: [0, 0, 1, 0.66] }, // emblème seul, sans la pastille du sponsor
  SA: {
    crop: [0, 0, 1, 0.54],
    alpha: (r, g, b, a) => (a > 128 && b > 200 && r < 100 && g > 90 ? 255 : 0),
  }, // parties bleues (le « A » évidé), sans le sponsor
  BL: {
    crop: [0, 0, 1, 0.8],
    alpha: (r, g, b, a) => (a > 128 && r > 150 && g < 90 && b < 90 ? 255 : 0),
  }, // carré rouge, joueur évidé
  SPL: {},
  UCL: { crop: [0, 0, 1, 0.5] }, // ballon étoilé seul
  UEL: { crop: [0, 0, 1, 0.56] }, // trophée seul
  UECL: { crop: [0, 0, 1, 0.53] }, // trophée seul
};

for (const file of readdirSync(raw)) {
  const code = file.replace(/\.\w+$/, "");
  const rule = RULES[code];
  if (!rule) continue;
  let img = sharp(`${raw}${file}`, { density: 400 }).resize(600, 600, { fit: "inside" }).ensureAlpha();
  let { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const alpha = rule.alpha ?? ((r, g, b, a) => a);
  const px = Buffer.alloc(info.width * info.height * 4, 255);
  for (let i = 0; i < info.width * info.height; i++) {
    px[i * 4 + 3] = alpha(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]);
  }
  let shape = sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
  // Marges retirées une première fois pour que le recadrage porte sur le logo lui-même
  ({ data, info } = await shape.trim({ threshold: 1 }).raw().toBuffer({ resolveWithObject: true }));
  shape = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
  if (rule.crop) {
    const [x, y, w, h] = rule.crop;
    shape = sharp(
      await shape
        .extract({
          left: Math.round(x * info.width),
          top: Math.round(y * info.height),
          width: Math.round(w * info.width),
          height: Math.round(h * info.height),
        })
        .png()
        .toBuffer(),
    ).trim({ threshold: 1 });
  }
  await shape.resize(256, 256, { fit: "inside" }).png({ compressionLevel: 9 }).toFile(`${out}${code}.png`);
  console.log(`${code} ✓`);
}
