// Télécharge les médias sources (photos libres Wikimedia Commons des joueurs, écussons des clubs depuis
// l'infobox Wikipédia) dans scripts/media/raw/ (non versionné) et écrit scripts/media/sources.json
// (auteur, licence, page source). Usage : node scripts/media/fetch.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("./", import.meta.url));
const data = JSON.parse(readFileSync(`${dir}wikidata.json`, "utf8"));
const UA = "petit-pont-media-script/1.0 (outil de developpement)";
mkdirSync(`${dir}raw/players`, { recursive: true });
mkdirSync(`${dir}raw/clubs`, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, type = "json") {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return type === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`Échec ${url}`);
}

const strip = (html) => (html ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const FREE = /^(CC0|CC BY(-SA)? \d|CC BY(-SA)?$|Public domain|PD|Attribution|GFDL|FAL)/i;

const sources = { players: {}, clubs: {} };

// --- Photos des joueurs (Commons, licences libres uniquement)
const withImage = Object.values(data.players).filter((p) => p.image);
for (let i = 0; i < withImage.length; i += 40) {
  const chunk = withImage.slice(i, i + 40);
  const q = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|extmetadata|size",
    iiurlwidth: "1000", titles: chunk.map((p) => `File:${p.image}`).join("|"),
  });
  const res = await get(`https://commons.wikimedia.org/w/api.php?${q}`);
  const norm = new Map((res.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of res.query.pages) {
    const original = norm.get(page.title) ?? page.title;
    const p = chunk.find((x) => `File:${x.image}` === original);
    const info = page.imageinfo?.[0];
    if (!p || !info) continue;
    const m = info.extmetadata ?? {};
    const license = strip(m.LicenseShortName?.value);
    if (!FREE.test(license)) {
      console.warn(`Licence non libre ignorée : ${p.slug} (${license})`);
      continue;
    }
    const file = `${dir}raw/players/${p.slug}.jpg`;
    if (!existsSync(file)) {
      writeFileSync(file, await get(info.thumburl ?? info.url, "bin"));
      await sleep(250);
    }
    sources.players[p.slug] = {
      file: page.title.replace(/^File:/, ""), page: info.descriptionurl, author: strip(m.Artist?.value) || "Inconnu",
      license, licenseUrl: m.LicenseUrl?.value ?? null,
    };
  }
}

// --- Écussons : fichier du paramètre « image » de l'infobox Wikipédia (en), rendu en PNG 320 px
const clubs = Object.entries(data.clubs);
for (let i = 0; i < clubs.length; i += 40) {
  const chunk = clubs.slice(i, i + 40);
  const q = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1", prop: "revisions", rvprop: "content",
    rvslots: "main", titles: chunk.map(([, c]) => c.title).join("|"),
  });
  const res = await get(`https://en.wikipedia.org/w/api.php?${q}`);
  const alias = new Map([...(res.query.normalized ?? []), ...(res.query.redirects ?? [])].map((n) => [n.from, n.to]));
  const pages = new Map(res.query.pages.map((p) => [p.title, p.revisions?.[0]?.slots?.main?.content ?? ""]));
  const files = {};
  for (const [code, c] of chunk) {
    let t = c.title;
    for (let k = 0; k < 3 && alias.has(t); k++) t = alias.get(t);
    const m = (pages.get(t) ?? "").match(/\|\s*(?:image|logo|crest)\s*=\s*(?:\[\[)?(?:File:|Image:)?([^\n|\]]+\.(?:svg|png|jpe?g|gif))/i);
    if (m) files[code] = m[1].trim();
    else console.warn(`Pas d'écusson : ${code}`);
  }
  const iq = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url", iiurlwidth: "320",
    titles: Object.values(files).map((n) => `File:${n}`).join("|"),
  });
  const ires = await get(`https://en.wikipedia.org/w/api.php?${iq}`);
  const inorm = new Map((ires.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of ires.query.pages) {
    const info = page.imageinfo?.[0];
    const asked = (inorm.get(page.title) ?? page.title).replace(/^File:/, "");
    for (const [code, name] of Object.entries(files)) {
      if (name !== asked || !info) continue;
      const file = `${dir}raw/clubs/${code}.png`;
      if (!existsSync(file)) {
        writeFileSync(file, await get(info.thumburl ?? info.url, "bin"));
        await sleep(250);
      }
      sources.clubs[code] = { file: page.title.replace(/^File:/, ""), page: info.descriptionurl };
    }
  }
}

writeFileSync(`${dir}sources.json`, JSON.stringify(sources, null, 2));
console.log(`${Object.keys(sources.players).length} photos, ${Object.keys(sources.clubs).length} écussons`);
