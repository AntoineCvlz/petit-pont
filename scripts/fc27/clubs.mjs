// Codes des clubs du catalogue importé (partagés par l'import SQL et la recherche d'écussons).
import { slugify } from "./csv.mjs";
import { CLUB_CODES, CLUB_NAMES, LEAGUES } from "./referentiel.mjs";

/** Clé « ligue|club » → { code, name, short, league, raw } (un même nom peut exister dans deux ligues). */
export function clubCodes(players) {
  const clubs = new Map();
  const usedCodes = new Set(Object.values(CLUB_CODES));
  for (const r of players) {
    const key = `${r.league}|${r.club}`;
    if (clubs.has(key)) continue;
    let code = CLUB_CODES[r.club];
    if (!code || [...clubs.values()].some((c) => c.code === code)) {
      const base = slugify(r.club).toUpperCase().slice(0, 24) || "CLUB";
      code = base;
      for (let k = 2; usedCodes.has(code); k++) code = `${base}-${k}`;
    }
    usedCodes.add(code);
    const name = CLUB_NAMES[r.club] ?? r.club;
    clubs.set(key, {
      code,
      name,
      short: name.length > 18 ? name.slice(0, 18).trim() : name,
      league: r.league,
      leagueCode: LEAGUES[r.league][0],
      raw: r.club,
    });
  }
  return clubs;
}
