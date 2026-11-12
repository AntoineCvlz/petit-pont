// Détourage (modèle IS-Net local, @imgly/background-removal-node) + recadrage buste façon carte de foot.
// Dépendance lourde, volontairement hors du projet : à installer dans un dossier à part
//   npm i @imgly/background-removal-node sharp
// puis exécuter ce script depuis ce dossier :
//   node cutout.mjs <projet>/scripts/media/raw/players <dossier de sortie> [slugs...]
import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
const [, , raw, out, ...only] = process.argv;
mkdirSync(out, { recursive: true });
// Recadrages manuels préalables (overrides.json → crops) quand le cadrage automatique se trompe
const overridesFile = `${raw}/../../overrides.json`;
const crops = existsSync(overridesFile) ? (JSON.parse(readFileSync(overridesFile, "utf8")).crops ?? {}) : {};
const slugs = only.length ? only : readdirSync(raw).filter((f) => f.endsWith(".jpg")).map((f) => f.slice(0, -4));
for (const slug of slugs) {
  const dest = `${out}/${slug}.webp`;
  if (existsSync(dest) && !only.length) continue;
  try {
    let source = sharp(`${raw}/${slug}.jpg`).rotate();
    const crop = crops[slug];
    if (crop) source = sharp(await source.toBuffer()).extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height });
    const input = await source.resize(1000, 1000, { fit: "inside" }).png().toBuffer();
    const blob = await removeBackground(new Blob([input], { type: "image/png" }), { model: "medium", output: { format: "image/png" } });
    const png = Buffer.from(await blob.arrayBuffer());
    if (crop?.frame) {
      // Cadre manuel : le recadrage fourni est déjà le buste final
      const framed = await sharp(png).resize(520, 546, { fit: "cover", position: "top" }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
      writeFileSync(dest, framed);
      console.log("ok", slug, "cadre manuel");
      continue;
    }
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, A = (x, y) => data[(y * W + x) * 4 + 3];
    // Largeur opaque par ligne
    const rows = [];
    for (let y = 0; y < H; y++) { let l = -1, r = -1; for (let x = 0; x < W; x++) if (A(x, y) > 128) { if (l < 0) l = x; r = x; } rows.push(l < 0 ? null : [l, r]); }
    const top = rows.findIndex(Boolean);
    if (top < 0) throw new Error("vide");
    // Tête : largeur médiane des lignes juste sous le sommet (~ hauteur d'une tête)
    const probe = rows.slice(top, top + Math.round(H * 0.12)).filter(Boolean).map(([l, r]) => r - l);
    probe.sort((a, b) => a - b);
    const head = Math.max(probe[Math.floor(probe.length * 0.6)] ?? 50, 30);
    const headRow = rows[top + Math.min(Math.round(head * 0.6), H - top - 1)] ?? rows[top];
    const cx = Math.round((headRow[0] + headRow[1]) / 2);
    // Cadre buste : ~3,4 têtes de large, ratio 1:1.05, tête vers le haut
    let size = Math.round(head * 3.4);
    size = Math.min(size, W, H);
    let left = Math.max(0, Math.min(W - size, cx - Math.round(size / 2)));
    let y0 = Math.max(0, top - Math.round(head * 0.35));
    const h = Math.min(Math.round(size * 1.05), H - y0);
    const buf = await sharp(png).extract({ left, top: y0, width: size, height: h }).resize(520, 546, { fit: "contain", position: "top", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
    writeFileSync(dest, buf);
    console.log("ok", slug, head);
  } catch (e) {
    console.log("ERREUR", slug, e.message);
  }
}
