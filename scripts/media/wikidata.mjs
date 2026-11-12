// Interroge Wikidata pour chaque joueur et club du seed : identifiant, club actuel (P54 sans date de fin),
// photo libre (P18) et logo (P154). Écrit scripts/media/wikidata.json (relu par les autres scripts).
// Usage : node scripts/media/wikidata.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const seed = readFileSync(`${root}supabase/seed.sql`, "utf8");
const UA = "petit-pont-media-script/1.0 (outil de developpement)";

/** Titres Wikipédia (en) des clubs du seed. */
export const CLUB_TITLES = {
  RMA: "Real Madrid CF", FCB: "FC Barcelona", PSG: "Paris Saint-Germain FC", MCI: "Manchester City F.C.",
  LIV: "Liverpool F.C.", ARS: "Arsenal F.C.", FCBY: "FC Bayern Munich", INT: "Inter Milan", ACM: "AC Milan",
  JUV: "Juventus FC", ATM: "Atlético Madrid", CHE: "Chelsea F.C.", MUN: "Manchester United F.C.",
  NAP: "SSC Napoli", BVB: "Borussia Dortmund", MIA: "Inter Miami CF", NAS: "Al Nassr FC", HIL: "Al Hilal SFC",
  AHL: "Al Ahli Saudi FC", ITT: "Ittihad Club", SAN: "Santos FC", OM: "Olympique de Marseille",
  OL: "Olympique Lyonnais", ASM: "AS Monaco FC", GAL: "Galatasaray S.K. (football)", LAFC: "Los Angeles FC",
  ATH: "Athletic Bilbao", RSO: "Real Sociedad", BHA: "Brighton & Hove Albion F.C.", CRY: "Crystal Palace F.C.",
  NEW: "Newcastle United F.C.", TOT: "Tottenham Hotspur F.C.", ATA: "Atalanta BC", AJX: "AFC Ajax",
  BOC: "Boca Juniors", BOR: "FC Girondins de Bordeaux", ASSE: "AS Saint-Étienne", PSV: "PSV Eindhoven",
  SAL: "FC Red Bull Salzburg",
  TRA: "Trabzonspor", CHI: "Chicago Fire FC", ORL: "Orlando City SC", SHA: "Al-Shamal SC",
  FEN: "Fenerbahçe S.K. (football)", DEP: "Deportivo de La Coruña", ROM: "AS Roma", RBL: "RB Leipzig",
  BJK: "Beşiktaş J.K.",
};

/** Titres Wikipédia (en) des joueurs dont le nom seul est ambigu. */
const PLAYER_TITLES = {
  messi: "Lionel Messi", "cristiano-ronaldo": "Cristiano Ronaldo", neymar: "Neymar", rodri: "Rodri (footballer, born 1996)",
  pedri: "Pedri", alisson: "Alisson Becker", vitinha: "Vitinha (footballer, born 2000)", marquinhos: "Marquinhos",
  raphinha: "Raphinha", gavi: "Gavi (footballer)", "vinicius-jr": "Vinícius Júnior", ronaldinho: "Ronaldinho",
  "ronaldo-nazario": "Ronaldo (Brazilian footballer)", kaka: "Kaká", pele: "Pelé", xavi: "Xavier Hernández Creus",
  "son-heung-min": "Son Heung-min", "kim-min-jae": "Kim Min-jae (footballer)", "lee-kang-in": "Lee Kang-in",
  "luis-diaz": "Luis Díaz (footballer, born 1997)", "lucas-hernandez": "Lucas Hernandez",
  "theo-hernandez": "Theo Hernandez", "julian-alvarez": "Julián Álvarez", "enzo-fernandez": "Enzo Fernández",
  "bruno-fernandes": "Bruno Fernandes", "bruno-guimaraes": "Bruno Guimarães", "bernardo-silva": "Bernardo Silva",
  "ruben-dias": "Rúben Dias", "joao-neves": "João Neves", "nuno-mendes": "Nuno Mendes (footballer, born 2002)",
  "rafael-leao": "Rafael Leão", "marcus-thuram": "Marcus Thuram", "jonathan-david": "Jonathan David",
  "ismaila-sarr": "Ismaïla Sarr", "dani-olmo": "Dani Olmo", "fermin-lopez": "Fermín López", balde: "Alejandro Balde",
  "nico-williams": "Nico Williams", "arda-guler": "Arda Güler", yildiz: "Kenan Yıldız", doue: "Désiré Doué",
  chevalier: "Lucas Chevalier", kane: "Harry Kane", rice: "Declan Rice", saka: "Bukayo Saka", henry: "Thierry Henry",
  "frenkie-de-jong": "Frenkie de Jong", "mac-allister": "Alexis Mac Allister", "cole-palmer": "Cole Palmer",
  "alphonso-davies": "Alphonso Davies", "alexander-arnold": "Trent Alexander-Arnold", davies: "Alphonso Davies",
  mane: "Sadio Mané", kessie: "Franck Kessié", etoo: "Samuel Eto'o", casillas: "Iker Casillas", isak: "Alexander Isak",
  "brahim-diaz": "Brahim Díaz", gouiri: "Amine Gouiri", balogun: "Folarin Balogun", olise: "Michael Olise",
  david: "Jonathan David", rulli: "Gerónimo Rulli", balerdi: "Leonardo Balerdi", mitoma: "Kaoru Mitoma",
  kubo: "Takefusa Kubo", minamino: "Takumi Minamino", lookman: "Ademola Lookman", marmoush: "Omar Marmoush",
};

function parsePlayers() {
  const block = seed.split("insert into public.players")[1].split(") as p(")[0];
  const re = /\('([a-z0-9-]+)', (?:'(?:[^']|'')*'|null), '(?:[^']|'')*', '((?:[^']|'')*)', '([A-Z]{3})', '(\w+)', (\d{4}), (true|false)/g;
  return [...block.matchAll(re)].map((m) => ({
    slug: m[1], name: m[2].replace(/''/g, "'"), nation: m[3], position: m[4], birthYear: Number(m[5]), legend: m[6] === "true",
  }));
}

async function api(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    console.error(`HTTP ${res.status}, nouvel essai`);
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  throw new Error(`Échec ${url}`);
}

/** Titres Wikipédia → QID Wikidata (redirections suivies). */
async function qidsFor(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const q = new URLSearchParams({
      action: "query", format: "json", redirects: "1", prop: "pageprops", ppprop: "wikibase_item", titles: chunk.join("|"),
    });
    const data = await api(`https://en.wikipedia.org/w/api.php?${q}`);
    const norm = new Map();
    for (const n of data.query.normalized ?? []) norm.set(n.from, n.to);
    for (const r of data.query.redirects ?? []) norm.set(r.from, r.to);
    const byTitle = {};
    for (const p of Object.values(data.query.pages)) byTitle[p.title] = p.pageprops?.wikibase_item ?? null;
    for (const t of chunk) {
      let cur = t;
      for (let k = 0; k < 3 && norm.has(cur); k++) cur = norm.get(cur);
      out[t] = byTitle[cur] ?? null;
    }
  }
  return out;
}

async function entities(ids, props = "claims|labels|descriptions") {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const q = new URLSearchParams({ action: "wbgetentities", format: "json", ids: ids.slice(i, i + 50).join("|"), props, languages: "fr|en" });
    const data = await api(`https://www.wikidata.org/w/api.php?${q}`);
    Object.assign(out, data.entities);
  }
  return out;
}

const timeYear = (q) => {
  const v = q?.[0]?.datavalue?.value?.time;
  return v ? Number(v.slice(1, 5)) : null;
};

const players = parsePlayers();
const playerTitles = Object.fromEntries(players.map((p) => [p.slug, PLAYER_TITLES[p.slug] ?? p.name]));
const pq = await qidsFor([...new Set(Object.values(playerTitles))]);
const cq = await qidsFor(Object.values(CLUB_TITLES));

const playerIds = players.map((p) => pq[playerTitles[p.slug]]).filter(Boolean);
const pe = await entities(playerIds);

// Clubs des joueurs (pour connaître leur nom / type) + clubs du seed
const teamIds = new Set(Object.values(cq).filter(Boolean));
for (const e of Object.values(pe)) for (const s of e.claims?.P54 ?? []) teamIds.add(s.mainsnak.datavalue?.value?.id);
teamIds.delete(undefined);
const te = await entities([...teamIds], "claims|labels");

const NATIONAL = new Set(["Q6979593", "Q23759293", "Q1194951", "Q23905105", "Q103229495", "Q23847779"]);
const isNational = (id) => (te[id]?.claims?.P31 ?? []).some((s) => NATIONAL.has(s.mainsnak.datavalue?.value?.id));
const label = (e) => e?.labels?.fr?.value ?? e?.labels?.en?.value ?? null;

const qidToClub = Object.fromEntries(Object.entries(CLUB_TITLES).map(([code, t]) => [cq[t], code]));

const result = { players: {}, clubs: {} };
for (const p of players) {
  const qid = pq[playerTitles[p.slug]];
  const e = qid ? pe[qid] : null;
  const born = timeYear(e?.claims?.P569?.map((s) => s.mainsnak.datavalue && { datavalue: s.mainsnak.datavalue }).filter(Boolean));
  const spells = (e?.claims?.P54 ?? [])
    .map((s) => {
      const id = s.mainsnak.datavalue?.value?.id;
      return {
        qid: id, name: label(te[id]), code: qidToClub[id] ?? null, national: isNational(id),
        start: timeYear(s.qualifiers?.P580), end: timeYear(s.qualifiers?.P582), loan: Boolean(s.qualifiers?.P1642),
        rank: s.rank,
      };
    })
    .filter((s) => s.qid && !s.national && s.rank !== "deprecated");
  const current = spells.filter((s) => s.end === null && s.start !== null).sort((a, b) => b.start - a.start);
  result.players[p.slug] = {
    ...p, qid, title: playerTitles[p.slug], description: e?.descriptions?.fr?.value ?? e?.descriptions?.en?.value ?? null,
    wikidataBirthYear: born, image: e?.claims?.P18?.[0]?.mainsnak.datavalue?.value ?? null,
    current: current.map(({ name, code, start, loan }) => ({ name, code, start, loan })), spells,
  };
}
for (const [code, title] of Object.entries(CLUB_TITLES)) {
  const qid = cq[title];
  result.clubs[code] = { title, qid, name: label(te[qid]), logo: te[qid]?.claims?.P154?.[0]?.mainsnak.datavalue?.value ?? null };
}
writeFileSync(`${root}scripts/media/wikidata.json`, JSON.stringify(result, null, 2));
console.log(`${players.length} joueurs, ${Object.keys(CLUB_TITLES).length} clubs → scripts/media/wikidata.json`);
