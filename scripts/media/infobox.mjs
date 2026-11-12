// Deuxième source pour le club actuel : le paramètre « currentclub » de l'infobox Wikipédia (en).
// Complète scripts/media/wikidata.json (champ infoboxClub). Usage : node scripts/media/infobox.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("./wikidata.json", import.meta.url));
const data = JSON.parse(readFileSync(file, "utf8"));
const UA = "petit-pont-media-script/1.0 (outil de developpement)";

async function api(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  throw new Error(`Échec ${url}`);
}

const entries = Object.values(data.players).filter((p) => !p.legend);
for (let i = 0; i < entries.length; i += 40) {
  const chunk = entries.slice(i, i + 40);
  const q = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1", prop: "revisions", rvprop: "content",
    rvslots: "main", titles: chunk.map((p) => p.title).join("|"),
  });
  const res = await api(`https://en.wikipedia.org/w/api.php?${q}`);
  const alias = new Map();
  for (const n of [...(res.query.normalized ?? []), ...(res.query.redirects ?? [])]) alias.set(n.from, n.to);
  const pages = new Map(res.query.pages.map((p) => [p.title, p.revisions?.[0]?.slots?.main?.content ?? ""]));
  for (const p of chunk) {
    let t = p.title;
    for (let k = 0; k < 3 && alias.has(t); k++) t = alias.get(t);
    const text = pages.get(t) ?? "";
    const m = text.match(/\|\s*current_?club\s*=\s*([^\n|]*(?:\[\[[^\]]*\]\][^\n|]*)*)/i);
    p.infoboxClub = m ? m[1].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/<[^>]+>|\{\{[^}]*\}\}/g, "").trim() : null;
    data.players[p.slug].infoboxClub = p.infoboxClub;
  }
}
writeFileSync(file, JSON.stringify(data, null, 2));
console.log("infoboxClub ajouté");
