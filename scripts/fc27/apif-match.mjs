// Rapprochement des clubs du catalogue avec les équipes d'API-Football (sans appel réseau).
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalize } from "./csv.mjs";
import { CLUB_NAMES } from "./referentiel.mjs";

const dir = fileURLToPath(new URL("./", import.meta.url));

/** Noms de licence ou abrégés du fichier → nom de l'équipe côté API (alias supplémentaire). */
const API_NAMES = {
  "Lombardia FC": "Inter",
  "Milano FC": "AC Milan",
  Latium: "Lazio",
  "Bergamo Calcio": "Atalanta",
  OL: "Lyon",
  OM: "Marseille",
  "Paris SG": "Paris Saint Germain",
  "M'gladbach": "Borussia Monchengladbach",
  LAFC: "Los Angeles FC",
  "LA Galaxy": "Los Angeles Galaxy",
  "Stade Rennais FC": "Rennes",
  "Havre AC": "Le Havre",
  "Man Utd": "Manchester United",
  "Man City": "Manchester City",
  Spurs: "Tottenham",
  "Nott'm Forest": "Nottingham Forest",
  "Sheffield Wed": "Sheffield Wednesday",
  "Al Qadsiah": "Al-Qadisiyah",
  "Al Taawoun": "Al Taawon",
  "Al Hazem": "Al-Hazm",
  "RC Deportivo": "Deportivo La Coruna",
  "CF Montréal": "CF Montreal",
  "Whitecaps FC": "Vancouver Whitecaps",
  "Red Bulls": "New York Red Bulls",
  "SJ Earthquakes": "San Jose Earthquakes",
  "Sounders FC": "Seattle Sounders",
  STVV: "St. Truiden",
  "R. Racing Club": "Racing Santander",
  "R. Sporting": "Sporting Gijon",
  "Club Tigres": "Tigres UANL",
  "Ind. Rivadavia": "Independ. Rivadavia",
  Pumas: "U.N.A.M. - Pumas",
  "Atl. Nacional": "Atletico Nacional",
  "Olympiacos FC": "Olympiakos Piraeus",
  "RB Salzburg": "Red Bull Salzburg",
  "D.C. United": "DC United",
  "FK Austria Wien": "Austria Vienna",
  "Whitecaps FC": "Vancouver Whitecaps",
  "Boca Juniors": "Boca Juniors",
  "Club Atlético Gimnasia y Esgrima": "Gimnasia Mendoza",
  Gimnasia: "Gimnasia L.P.",
};

// Équipes féminines, réserves, jeunes : jamais candidates
const NOT_FIRST_TEAM = /(\s(W|U\d{2}|II|III|B|C|2|Reserves?|Youth|Juniors?|Women|Fem\w*|Res\.?))$|\s&\s|Stars$/i;
const STOP = new Set([
  "fc",
  "cf",
  "sc",
  "ac",
  "afc",
  "club",
  "cd",
  "ud",
  "sd",
  "fk",
  "if",
  "de",
  "cp",
  "f",
  "c",
  "a",
  "s",
  "the",
  "and",
  "football",
  "futbol",
  "calcio",
]);
const tokens = (s) =>
  normalize(s)
    .split(" ")
    .filter((t) => t && !STOP.has(t));

const wikiTitles = (() => {
  const file = `${dir}out/crest-sources.json`;
  if (!existsSync(file)) return {};
  const src = JSON.parse(readFileSync(file, "utf8"));
  return Object.fromEntries(
    Object.entries(src).map(([code, s]) => [
      code,
      decodeURIComponent(s.page.split("/wiki/")[1] ?? "")
        .replace(/_/g, " ")
        .replace(/\s*\(.*\)$/, ""),
    ]),
  );
})();

export function aliases(club) {
  return [club.raw, club.name, CLUB_NAMES[club.raw], API_NAMES[club.raw], wikiTitles[club.code]].filter(Boolean);
}

function score(alias, teamName) {
  if (normalize(alias) === normalize(teamName)) return 100;
  const a = tokens(alias);
  const b = tokens(teamName);
  if (!a.length || !b.length) return 0;
  let common = 0;
  for (const t of b) {
    if (a.includes(t)) common += 1;
    else if (t.length >= 4 && a.some((x) => x.length >= 4 && (x.startsWith(t) || t.startsWith(x)))) common += 0.6;
  }
  return (0.7 * (common / b.length) + 0.3 * Math.min(1, common / a.length)) * 90;
}

/** Équipes candidates (meilleures d'abord, au plus 3), au-dessus du seuil. */
export function matchCandidates(club, teams) {
  const scored = [];
  for (const { team } of teams) {
    if (team.national) continue;
    const s = Math.max(...aliases(club).map((al) => score(al, team.name)));
    if (s < 55 || (s < 100 && NOT_FIRST_TEAM.test(team.name.trim()))) continue;
    scored.push({ team, score: s });
  }
  return scored.sort((a, b) => b.score - a.score || a.team.name.length - b.team.name.length).slice(0, 3);
}

/** Meilleure équipe première pour un club, ou null (seuil strict). */
export function matchTeam(club, teams) {
  let best = null;
  let bestScore = 0;
  for (const { team } of teams) {
    if (team.national) continue;
    const s = Math.max(...aliases(club).map((al) => score(al, team.name)));
    // Nom identique : accepté même s'il ressemble à une réserve (« Willem II »)
    if (s < 100 && NOT_FIRST_TEAM.test(team.name.trim())) continue;
    if (s > bestScore || (s === bestScore && best && team.name.length < best.name.length)) [best, bestScore] = [team, s];
  }
  return bestScore >= 55 ? { team: best, score: bestScore } : null;
}

/** Pays supplémentaires où l'API range des clubs d'un championnat étranger (code de ligue du fichier). */
export const EXTRA_COUNTRIES = {
  MLS: ["Canada"],
  "Isuzu UTE A League": ["New-Zealand"],
  "EFL Championship": ["Wales"],
  "EFL League One": ["Wales"],
  "EFL League Two": ["Wales"],
  "Brack Super League": ["Liechtenstein"],
  "Premier League": ["Wales"],
};
