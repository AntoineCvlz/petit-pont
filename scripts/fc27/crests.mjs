// Écussons des clubs du catalogue importé : page Wikipédia (en) du club trouvée par recherche
// (nom + pays de la ligue), logo du paramètre image/logo de l'infobox « football club », rendu en PNG 320 px.
// Sorties : scripts/media/raw/clubs/<code>.png (non versionné) et scripts/fc27/out/crest-sources.json.
// Usage : node scripts/fc27/crests.mjs <players.csv>   (clubs déjà pourvus d'un écusson ignorés)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadPlayers } from "./csv.mjs";
import { CLUB_CODES, CLUB_NAMES, LEAGUES, NATIONS } from "./referentiel.mjs";
import { clubCodes } from "./clubs.mjs";

const dir = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const rawDir = `${root}scripts/media/raw/clubs/`;
mkdirSync(rawDir, { recursive: true });
const UA = "petit-pont-media-script/1.0 (outil de developpement)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, type = "json") {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return type === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
    // L'API limite le débit : on respecte le délai demandé
    const wait = Number(res.headers.get("retry-after") ?? 0) * 1000 || 3000 * (attempt + 1);
    await sleep(wait + 500);
  }
  throw new Error(`Échec ${url}`);
}
async function api(params) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await get(url);
    if (!res.error) return res;
    // Limitation de débit signalée dans la réponse (ratelimited, maxlag) : on patiente
    await sleep(5000 * (attempt + 1));
  }
  throw new Error(`API indisponible : ${url}`);
}

/** Titres Wikipédia imposés quand la recherche se trompe (nom abrégé ou licence de nom). */
const TITLES = {
  Latium: "SS Lazio",
  "Nott'm Forest": "Nottingham Forest F.C.",
  "Sheffield Wed": "Sheffield Wednesday F.C.",
  Wolves: "Wolverhampton Wanderers F.C.",
  Spurs: "Tottenham Hotspur F.C.",
  "St. Pats": "St Patrick's Athletic F.C.",
  "Melb. Victory": "Melbourne Victory FC",
  "Melb. City": "Melbourne City FC",
  "Atl. Nacional": "Atlético Nacional",
  "Univ. Craiova": "CS Universitatea Craiova",
  "FC Univ. Cluj": "FC Universitatea Cluj",
  "CFR 1907 Cluj": "CFR Cluj",
  "R. Oviedo": "Real Oviedo",
  "D. Alavés": "Deportivo Alavés",
  "R. Racing Club": "Racing de Santander",
  "R. Union St.-G.": "Royale Union Saint-Gilloise",
  FCSB: "FCSB",
};

const country = Object.fromEntries(Object.entries(NATIONS).map(([en, [code]]) => [code, en]));
const players = loadPlayers(process.argv[2]);
const codes = clubCodes(players);
const sourcesFile = `${dir}out/crest-sources.json`;
const sources = existsSync(sourcesFile) ? JSON.parse(readFileSync(sourcesFile, "utf8")) : {};

const todo = [...codes.values()].filter((c) => !Object.values(CLUB_CODES).includes(c.code) && !sources[c.code]);
console.log(`${todo.length} clubs à chercher`);

/** Wikitexte de plusieurs pages (redirections suivies) : titre demandé → { title, text }. */
async function pages(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const res = await api({
      action: "query",
      redirects: "1",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      titles: chunk.join("|"),
    });
    const alias = new Map([...(res.query.normalized ?? []), ...(res.query.redirects ?? [])].map((n) => [n.from, n.to]));
    const byTitle = new Map(res.query.pages.map((p) => [p.title, p.revisions?.[0]?.slots?.main?.content ?? ""]));
    for (const t of chunk) {
      let cur = t;
      for (let k = 0; k < 3 && alias.has(cur); k++) cur = alias.get(cur);
      out.set(t, { title: cur, text: byTitle.get(cur) ?? "" });
    }
  }
  return out;
}

function infoboxFile(text) {
  if (!/\{\{\s*Infobox (football|soccer) club/i.test(text)) return null;
  const m = text.match(/\|\s*(?:image|logo|crest)\s*=\s*(?:\[\[)?(?:File:|Image:)?([^\n|\]]+\.(?:svg|png|jpe?g|gif))/i);
  return m ? m[1].trim() : null;
}

// 1. Candidats : titre imposé, puis résultats de recherche (une requête par club, en série)
// Résultats mis en cache (reprise possible : l'API limite fortement le débit)
const searchFile = `${dir}out/crest-search.json`;
const cache = existsSync(searchFile) ? JSON.parse(readFileSync(searchFile, "utf8")) : {};
const candidates = new Map();
let n = 0;
for (const c of todo) {
  if (cache[c.code]) {
    candidates.set(c.code, cache[c.code]);
    n++;
    continue;
  }
  const list = TITLES[c.raw] ? [TITLES[c.raw]] : [];
  const nation = country[LEAGUES[c.league][3]] ?? "";
  const res = await api({
    action: "query",
    list: "search",
    srlimit: "4",
    srsearch: `${CLUB_NAMES[c.raw] ?? c.raw} football club ${nation}`,
  });
  for (const hit of res.query.search) {
    if (!/season|national|women|reserves|under-|U\d\d|stadium|list of/i.test(hit.title)) list.push(hit.title);
  }
  candidates.set(c.code, list);
  if (++n % 25 === 0)
    process.stdout.write(`
Recherche : ${n}/${todo.length}`);
  await sleep(200);
}
console.log();

// 2. Wikitexte des candidats par lots, premier qui a une infobox de club avec un logo
const texts = await pages([...new Set([...candidates.values()].flat())]);
const chosen = new Map();
for (const c of todo) {
  for (const t of candidates.get(c.code) ?? []) {
    const p = texts.get(t);
    const file = p && infoboxFile(p.text);
    if (file) {
      chosen.set(c.code, { club: c, title: p.title, file });
      break;
    }
  }
  if (!chosen.has(c.code)) console.warn(`Pas d'écusson : ${c.raw} (${c.league})`);
}

// 3. URL des fichiers par lots, puis téléchargement (serveur d'images, non limité ici)
const entries = [...chosen.values()];
for (let i = 0; i < entries.length; i += 50) {
  const chunk = entries.slice(i, i + 50);
  const res = await api({
    action: "query",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "320",
    titles: chunk.map((e) => `File:${e.file}`).join("|"),
  });
  const norm = new Map((res.query.normalized ?? []).map((x) => [x.to, x.from]));
  const infos = new Map(res.query.pages.map((p) => [(norm.get(p.title) ?? p.title).replace(/^File:/, ""), p.imageinfo?.[0]]));
  for (const e of chunk) {
    const info = infos.get(e.file);
    if (!info) continue;
    try {
      writeFileSync(`${rawDir}${e.club.code}.png`, await get(info.thumburl ?? info.url, "bin"));
    } catch {
      console.warn(`Téléchargement impossible : ${e.club.raw}`);
      continue;
    }
    sources[e.club.code] = {
      name: e.club.name,
      raw: e.club.raw,
      page: `https://en.wikipedia.org/wiki/${encodeURIComponent(e.title.replace(/ /g, "_"))}`,
      file: info.descriptionurl,
    };
  }
  writeFileSync(sourcesFile, JSON.stringify(sources, null, 2));
  process.stdout.write(`
Téléchargement : ${Math.min(i + 50, entries.length)}/${entries.length}`);
}
console.log(`
${Object.keys(sources).length} écussons téléchargés`);
