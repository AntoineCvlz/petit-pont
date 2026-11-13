// Photos libres (Wikimedia Commons) des meilleurs joueurs du catalogue importé.
// Identification sans ambiguïté par Wikidata : footballeur (P106 = Q937857) né le jour exact (P569)
// dont le libellé contient le nom du joueur ; image P18 sous licence libre uniquement.
// Sorties (non versionnées) : scripts/media/raw/players/fc<ext_id>.jpg et scripts/fc27/out/photo-sources.json.
// Usage : node scripts/fc27/photos.mjs <players.csv> [note minimale = 80]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { displayName, loadPlayers, normalize } from "./csv.mjs";

const dir = fileURLToPath(new URL("./", import.meta.url));
const rawDir = fileURLToPath(new URL("../media/raw/players/", import.meta.url));
const [, , csvPath, minArg] = process.argv;
if (!csvPath) {
  console.error("Usage : node scripts/fc27/photos.mjs <players.csv> [note minimale]");
  process.exit(1);
}
const MIN = Number(minArg ?? 80);
const UA = "petit-pont-media-script/1.0 (outil de developpement)";
const FREE = /^(CC0|CC BY(-SA)? \d|CC BY(-SA)?$|Public domain|PD|Attribution|GFDL|FAL)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html) =>
  (html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
mkdirSync(rawDir, { recursive: true });
mkdirSync(`${dir}out`, { recursive: true });

async function get(url, type = "json", init = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) } });
    if (res.ok) return type === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
    console.error(`HTTP ${res.status}, nouvel essai`);
    await sleep(5000 * (attempt + 1));
  }
  throw new Error(`Échec ${url}`);
}

// Joueurs déjà présents avec une photo (export de la base locale) : rien à chercher
const existingFile = `${dir}out/existing.json`;
const existing = existsSync(existingFile) ? JSON.parse(readFileSync(existingFile, "utf8")) : [];
const hasPhoto = (r) => {
  const year = Number(r.birthdate.slice(0, 4));
  const name = normalize(displayName(r));
  return existing.some((e) => e.img && e.y === year && normalize(e.n).includes(name));
};

const targets = loadPlayers(csvPath).filter((r) => Number(r.overall_rating) >= MIN && r.birthdate && !hasPhoto(r));
console.log(`${targets.length} joueurs à chercher (note ≥ ${MIN}, sans photo existante)`);

// --- 1. Wikidata : candidats nés aux mêmes dates
const byDate = new Map();
for (const r of targets) byDate.set(r.birthdate, [...(byDate.get(r.birthdate) ?? []), r]);
const dates = [...byDate.keys()];
const found = {}; // ext_id → { qid, image }
for (let i = 0; i < dates.length; i += 60) {
  const values = dates
    .slice(i, i + 60)
    .map((d) => `"${d}T00:00:00Z"^^xsd:dateTime`)
    .join(" ");
  const query = `SELECT ?p ?d ?img (GROUP_CONCAT(DISTINCT LCASE(?l); separator="|") AS ?labels) WHERE {
    VALUES ?d { ${values} }
    ?p wdt:P569 ?d; wdt:P106 wd:Q937857; wdt:P18 ?img.
    { ?p rdfs:label ?l } UNION { ?p skos:altLabel ?l }
  } GROUP BY ?p ?d ?img`;
  const data = await get("https://query.wikidata.org/sparql", "json", {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }),
  });
  for (const b of data.results.bindings) {
    const date = b.d.value.slice(0, 10);
    const labels = b.labels.value.split("|").map(normalize);
    for (const r of byDate.get(date) ?? []) {
      if (found[r.player_id]) continue;
      const keys = [normalize(displayName(r)), normalize(`${r.first_name} ${r.last_name}`), normalize(r.last_name)];
      const last = normalize(r.last_name).split(" ");
      const ok =
        labels.some(
          (l) =>
            keys.some((k) => k && l === k) ||
            (last[0].length > 2 &&
              l.split(" ").includes(last[0]) &&
              l.split(" ").includes(normalize(r.first_name).split(" ")[0])),
        ) || labels.some((l) => r.common_name && l === normalize(r.common_name));
      if (ok) found[r.player_id] = { qid: b.p.value.split("/").pop(), image: decodeURIComponent(b.img.value.split("/").pop()) };
    }
  }
  process.stdout.write(
    `\rWikidata : ${Math.min(i + 60, dates.length)}/${dates.length} dates, ${Object.keys(found).length} trouvés`,
  );
  await sleep(1000);
}
console.log();

// --- 2. Commons : licence libre + téléchargement
const sourcesFile = `${dir}out/photo-sources.json`;
const sources = existsSync(sourcesFile) ? JSON.parse(readFileSync(sourcesFile, "utf8")) : {};
const entries = Object.entries(found);
const names = new Map(targets.map((r) => [r.player_id, displayName(r)]));
for (let i = 0; i < entries.length; i += 40) {
  const chunk = entries.slice(i, i + 40);
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1000",
    titles: chunk.map(([, f]) => `File:${f.image}`).join("|"),
  });
  const res = await get(`https://commons.wikimedia.org/w/api.php?${q}`);
  const norm = new Map((res.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of res.query.pages) {
    const asked = (norm.get(page.title) ?? page.title).replace(/^File:/, "");
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const m = info.extmetadata ?? {};
    const license = strip(m.LicenseShortName?.value);
    for (const [id, f] of chunk) {
      if (f.image !== asked) continue;
      if (!FREE.test(license)) {
        console.warn(`Licence non libre ignorée : ${names.get(id)} (${license})`);
        continue;
      }
      const file = `${rawDir}fc${id}.jpg`;
      if (!existsSync(file)) {
        try {
          writeFileSync(file, await get(info.thumburl ?? info.url, "bin"));
        } catch {
          console.warn(`\nTéléchargement impossible (réessayer plus tard) : ${names.get(id)}`);
          continue;
        }
        await sleep(1500); // Wikimedia limite fortement le débit des téléchargements
      }
      sources[id] = {
        slug: `fc${id}`,
        name: names.get(id),
        qid: f.qid,
        file: page.title.replace(/^File:/, ""),
        page: info.descriptionurl,
        author: strip(m.Artist?.value) || "Auteur inconnu",
        license,
        licenseUrl: m.LicenseUrl?.value ?? null,
      };
    }
  }
  process.stdout.write(`\rCommons : ${Math.min(i + 40, entries.length)}/${entries.length}`);
  writeFileSync(sourcesFile, JSON.stringify(sources, null, 2));
}
console.log();
writeFileSync(sourcesFile, JSON.stringify(sources, null, 2));
console.log(`${Object.keys(sources).length} photos libres téléchargées sur ${targets.length} joueurs`);
