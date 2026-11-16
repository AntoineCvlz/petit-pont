// Photos des joueurs via API-Football (api-sports.io, offre gratuite : 100 requêtes / jour, 10 / minute).
// Reprise automatique : chaque réponse est mise en cache dans scripts/fc27/out/apifootball/ ; relancer
// chaque jour jusqu'à « terminé ». Le téléchargement des photos ne consomme pas de requêtes.
//   1. équipes par pays (une requête par pays)   2. effectif de chaque club (une requête par club)
//   3. rapprochement club + nom (+ âge)          4. photos → scripts/fc27/out/media-ext/players/<ext_id>.webp
// Clé : API_FOOTBALL_KEY dans .env.local (jamais versionnée).
// Usage : node scripts/fc27/apifootball.mjs <players.csv>
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { displayName, loadPlayers, normalize } from "./csv.mjs";
import { clubCodes } from "./clubs.mjs";
import { CLUB_NAMES, LEAGUES, NATIONS } from "./referentiel.mjs";
import { EXTRA_COUNTRIES, matchCandidates } from "./apif-match.mjs";

const dir = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const cacheDir = `${dir}out/apifootball/`;
const photoDir = `${dir}out/media-ext/players/`;
mkdirSync(`${cacheDir}teams`, { recursive: true });
mkdirSync(`${cacheDir}squads`, { recursive: true });
mkdirSync(photoDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const env = existsSync(`${root}.env.local`) ? readFileSync(`${root}.env.local`, "utf8") : "";
const KEY = process.env.API_FOOTBALL_KEY || env.match(/^API_FOOTBALL_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("Clé manquante : ajoute API_FOOTBALL_KEY=… dans .env.local");
  process.exit(1);
}

// --- Appels à l'API (quota respecté, arrêt propre quand la limite du jour est atteinte)
class QuotaReached extends Error {}
let calls = 0;
async function api(path) {
  await sleep(6500); // ≤ 10 requêtes par minute
  const res = await fetch(`https://v3.football.api-sports.io${path}`, { headers: { "x-apisports-key": KEY } });
  calls++;
  const body = await res.json();
  const errors = body.errors && !Array.isArray(body.errors) ? Object.values(body.errors).join(" ") : "";
  if (/request limit|requests limit|reached the request/i.test(errors) || res.status === 429) throw new QuotaReached(errors);
  if (errors) throw new Error(`${path} : ${errors}`);
  const left = res.headers.get("x-ratelimit-requests-remaining");
  if (left !== null && Number(left) <= 0) throw new QuotaReached("quota du jour épuisé");
  return body.response;
}
// Quota atteint : on continue avec ce qui est en cache (null pour le reste)
let quota = false;
async function cached(file, path) {
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (quota) return null;
  try {
    const data = await api(path);
    writeFileSync(file, JSON.stringify(data));
    return data;
  } catch (e) {
    if (!(e instanceof QuotaReached)) throw e;
    quota = true;
    console.log(`Quota du jour atteint (${calls} requêtes) : la suite utilise le cache, relance demain.`);
    return null;
  }
}

// --- Pays de l'API (anglais, espaces → tirets) pour chaque ligue du fichier
const COUNTRY_FIX = {
  Holland: "Netherlands",
  "Korea Republic": "South-Korea",
  "United States": "USA",
  "China PR": "China",
  "Republic of Ireland": "Ireland",
  "Czech Republic": "Czech-Republic",
};
const fifaToEn = Object.fromEntries(Object.entries(NATIONS).map(([en, [code]]) => [code, en]));
const apiCountry = (fifa) => {
  const en = fifaToEn[fifa];
  return en ? (COUNTRY_FIX[en] ?? en).replace(/ /g, "-") : null;
};

const players = loadPlayers(process.argv[2]);
const clubs = [...clubCodes(players).values()];
const state = { teams: 0, squads: 0, matched: 0, photos: 0 };
const searchWord = (c) =>
  (
    normalize(CLUB_NAMES[c.raw] ?? c.raw)
      .split(" ")
      .filter((t) => t.length > 2)
      .sort((x, y) => y.length - x.length)[0] ?? ""
  ).slice(0, 20);
const now = new Date();
const ageOf = (iso) => {
  const d = new Date(iso);
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};
/** Joueur de l'effectif API correspondant : nom affiché / complet, ou nom de famille + initiale (« K. Mbappé »), âge ±1. */
function findInSquad(r, squad) {
  const last = normalize(r.last_name).split(" ");
  const first = normalize(r.first_name);
  const shown = normalize(displayName(r));
  const age = ageOf(r.birthdate);
  return squad.find((p) => {
    const n = normalize(p.name);
    if (p.age && Math.abs(p.age - age) > 1) return false;
    if (n === shown || n === normalize(`${r.first_name} ${r.last_name}`)) return true;
    const parts = n.split(" ");
    const initial = parts.length > 1 && parts[0].length === 1 ? parts[0] : null;
    const surname = initial ? parts.slice(1).join(" ") : n;
    const lastOk = last.some((t) => t.length > 2 && surname.split(" ").includes(t)) || surname === last.join(" ");
    return lastOk && (!initial || first.startsWith(initial));
  });
}

const playersByClub = new Map();
for (const r of players) {
  const code = clubs.find((c) => c.league === r.league && c.raw === r.club).code;
  playersByClub.set(code, [...(playersByClub.get(code) ?? []), r]);
}

const candidates = new Map(); // code club → ids API candidats (meilleur d'abord)
const squads = new Map(); // code club → effectif validé
{
  // 1. Équipes par pays (+ pays voisins), puis recherche par nom pour les clubs restants
  const byCountry = new Map();
  for (const c of clubs) {
    const key = apiCountry(LEAGUES[c.league][3]) ?? `search:${c.code}`;
    byCountry.set(key, [...(byCountry.get(key) ?? []), c]);
  }
  const addCandidates = (c, teams) => {
    const ids = candidates.get(c.code) ?? [];
    if (!teams) return;
    for (const m of matchCandidates(c, teams)) if (!ids.includes(m.team.id)) ids.push(m.team.id);
    if (ids.length) candidates.set(c.code, ids);
  };
  for (const [key, list] of byCountry) {
    const teams = key.startsWith("search:")
      ? await cached(
          `${cacheDir}teams/${key.replace(/[^A-Z0-9-]/gi, "_")}.json`,
          `/teams?search=${encodeURIComponent(searchWord(list[0]))}`,
        )
      : await cached(`${cacheDir}teams/${key}.json`, `/teams?country=${encodeURIComponent(key)}`);
    for (const c of list) addCandidates(c, teams);
  }
  for (const c of clubs.filter((x) => !candidates.has(x.code))) {
    for (const country of EXTRA_COUNTRIES[c.league] ?? [])
      addCandidates(c, await cached(`${cacheDir}teams/${country}.json`, `/teams?country=${country}`));
  }
  for (const c of clubs.filter((x) => !candidates.has(x.code))) {
    const q = searchWord(c);
    if (q)
      addCandidates(
        c,
        await cached(
          `${cacheDir}teams/search2_${c.code.replace(/[^A-Z0-9-]/gi, "_")}.json`,
          `/teams?search=${encodeURIComponent(q)}`,
        ),
      );
  }
  state.teams = candidates.size;
  console.log(`Clubs avec au moins un candidat : ${candidates.size}/${clubs.length}`);

  // 2. Effectifs : le premier candidat dont l'effectif contient assez de nos joueurs est retenu
  for (const [code, ids] of candidates) {
    const roster = playersByClub.get(code) ?? [];
    const need = roster.length <= 3 ? 1 : Math.max(2, Math.ceil(roster.length * 0.3));
    for (const id of ids.slice(0, 3)) {
      const data = await cached(`${cacheDir}squads/${id}.json`, `/players/squads?team=${id}`);
      if (!data) break;
      const squad = data[0]?.players ?? [];
      if (roster.filter((r) => findInSquad(r, squad)).length >= need) {
        squads.set(code, squad);
        break;
      }
    }
    state.squads++;
    if (state.squads % 20 === 0) console.log(`Effectifs : ${state.squads}/${candidates.size}`);
  }
}
console.log(`Clubs validés : ${squads.size} (examinés ${state.squads}/${candidates.size || "?"})`);

// 3. Rapprochement des joueurs dans les effectifs validés
const mapping = {};
for (const [code, squad] of squads) {
  for (const r of playersByClub.get(code) ?? []) {
    const hit = findInSquad(r, squad);
    if (hit?.photo) mapping[r.player_id] = hit.photo;
  }
}
state.matched = Object.keys(mapping).length;
writeFileSync(`${dir}out/apifootball-photos.json`, JSON.stringify(mapping, null, 1));
console.log(`Joueurs rapprochés : ${state.matched}/${players.length}`);

{
  // 4. Photos (serveur d'images, hors quota) ; la silhouette générique de l'API est ignorée
  const hashes = new Map();
  for (const [id, url] of Object.entries(mapping)) {
    const out = `${photoDir}${id}.webp`;
    if (existsSync(out)) {
      state.photos++;
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const h = createHash("md5").update(buf).digest("hex");
    hashes.set(h, (hashes.get(h) ?? 0) + 1);
    if (hashes.get(h) > 3) continue; // image par défaut partagée
    await sharp(buf).resize(240, 240, { fit: "cover" }).webp({ quality: 85 }).toFile(out);
    state.photos++;
    if (state.photos % 500 === 0) console.log(`Photos : ${state.photos}`);
    await sleep(50);
  }
  // Image par défaut de l'API (silhouette) : même fichier pour beaucoup de joueurs → retirée
  const groups = new Map();
  for (const file of readdirSync(photoDir)) {
    const h = createHash("md5")
      .update(readFileSync(photoDir + file))
      .digest("hex");
    groups.set(h, [...(groups.get(h) ?? []), file]);
  }
  for (const files of groups.values()) {
    if (files.length > 3) for (const file of files) rmSync(photoDir + file);
  }
  state.photos = readdirSync(photoDir).length;
  console.log(`Terminé : ${state.photos} photos dans scripts/fc27/out/media-ext/players (${calls} requêtes aujourd'hui)`);
}
if (quota) console.log("Relance le script demain pour continuer.");
