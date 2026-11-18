/**
 * Équipe de la semaine : sélection d'un 4-3-3 à partir des performances réelles de la semaine (football-data.org),
 * rapprochées du catalogue. Fonctions pures (testées) ; la récupération des données est dans la route /api/cron/totw.
 */

/** Compétitions gratuites de football-data.org → code de ligue du catalogue. */
export const FD_COMPETITIONS: Record<string, string> = { FL1: "L1", PL: "PL", PD: "LL", SA: "SA", BL1: "BL" };

export type FdTeam = { id: number; name: string; shortName?: string | null; tla?: string | null };

/** Performance offensive de la semaine d'un joueur réel. */
export type FdPerformer = {
  name: string;
  dateOfBirth?: string | null;
  team: FdTeam;
  competition: string;
  goals: number;
  assists: number;
};

/** Résultats de la semaine d'une équipe réelle. */
export type FdTeamWeek = { team: FdTeam; competition: string; played: number; wins: number; cleanSheets: number; goalsAgainst: number };

/** Carte de base du catalogue (5 grands championnats). */
export type CatalogCard = {
  templateId: number;
  rating: number;
  position: "GB" | "DEF" | "MIL" | "ATT";
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  birthdate?: string | null;
  club: { code: string; name: string; shortName?: string | null };
  league: string;
};

export type TotwPick = { templateId: number; boost: number; reason: string; position: CatalogCard["position"] };

export function normalizeName(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CLUB_NOISE = /\b(fc|cf|ac|as|ssc|afc|sc|sv|vfb|vfl|tsg|rc|ogc|losc|stade|club|de|calcio|1|fk|ud|cd|rcd|real club|hotspur|and|hove|albion|united|city)\b/g;
function clubKey(v: string): string {
  return normalizeName(v).replace(CLUB_NOISE, " ").replace(/\s+/g, " ").trim();
}

/** Club du catalogue correspondant à une équipe réelle (même ligue ; nom, nom court ou sigle). */
export function matchClub(team: FdTeam, league: string, clubs: CatalogCard["club"][]): string | null {
  const keys = [team.name, team.shortName ?? "", team.tla ?? ""].filter(Boolean).map(clubKey).filter(Boolean);
  let best: { code: string; score: number } | null = null;
  for (const c of clubs) {
    const ours = [c.name, c.shortName ?? "", c.code].filter(Boolean).map(clubKey).filter(Boolean);
    let score = 0;
    for (const k of keys)
      for (const o of ours) {
        if (k === o) score = Math.max(score, 3);
        else if (k.length >= 4 && o.length >= 4 && (k.includes(o) || o.includes(k))) score = Math.max(score, 2);
      }
    if (score > 0 && (!best || score > best.score)) best = { code: c.code, score };
  }
  void league;
  return best?.code ?? null;
}

/** Carte du catalogue correspondant à un joueur réel (même club ; date de naissance ou nom). */
export function matchPlayer(p: FdPerformer, clubCode: string | null, cards: CatalogCard[]): CatalogCard | null {
  const n = normalizeName(p.name);
  const last = n.split(" ").at(-1) ?? n;
  const pool = clubCode ? cards.filter((c) => c.club.code === clubCode) : cards;
  const byDob = p.dateOfBirth ? pool.filter((c) => c.birthdate === p.dateOfBirth) : [];
  if (byDob.length === 1) return byDob[0]!;
  const sameName = (byDob.length ? byDob : pool).filter((c) => {
    const full = normalizeName(c.name);
    const ln = normalizeName(c.lastName ?? "");
    return full === n || (ln && (ln === last || n.endsWith(ln))) || full.split(" ").at(-1) === last;
  });
  return sameName.length === 1 ? sameName[0]! : (sameName.sort((a, b) => b.rating - a.rating)[0] ?? null);
}

/** 4-3-3 de la semaine : attaque et milieu sur buts + passes, défense et gardien sur clean sheets et victoires. */
export function selectTotw(performers: FdPerformer[], teams: FdTeamWeek[], cards: CatalogCard[]): TotwPick[] {
  const clubsByLeague = new Map<string, CatalogCard["club"][]>();
  for (const c of cards) {
    const list = clubsByLeague.get(c.league) ?? [];
    if (!list.some((x) => x.code === c.club.code)) list.push(c.club);
    clubsByLeague.set(c.league, list);
  }
  const clubOf = (team: FdTeam, competition: string) =>
    matchClub(team, FD_COMPETITIONS[competition] ?? "", clubsByLeague.get(FD_COMPETITIONS[competition] ?? "") ?? []);

  // Résultats par club du catalogue
  const clubWeek = new Map<string, FdTeamWeek>();
  for (const t of teams) {
    const code = clubOf(t.team, t.competition);
    if (code) clubWeek.set(code, t);
  }

  const used = new Set<number>();
  const picks: TotwPick[] = [];
  const take = (card: CatalogCard, boost: number, reason: string) => {
    used.add(card.templateId);
    picks.push({ templateId: card.templateId, boost, reason, position: card.position });
  };

  // Attaque / milieu : buts × 4 + passes × 3
  const attackers = performers
    .map((p) => ({ p, card: matchPlayer(p, clubOf(p.team, p.competition), cards) }))
    .filter((x): x is { p: FdPerformer; card: CatalogCard } => x.card !== null && x.p.goals + x.p.assists > 0)
    .map((x) => ({ ...x, points: x.p.goals * 4 + x.p.assists * 3 }))
    .sort((a, b) => b.points - a.points || b.card.rating - a.card.rating);
  const reasonOf = (g: number, a: number) =>
    [g ? `${g} but${g > 1 ? "s" : ""}` : "", a ? `${a} passe${a > 1 ? "s" : ""} déc.` : ""].filter(Boolean).join(", ");
  for (const pos of ["ATT", "MIL"] as const) {
    for (const x of attackers) {
      if (picks.filter((k) => k.position === pos).length >= 3) break;
      if (x.card.position !== pos || used.has(x.card.templateId)) continue;
      take(x.card, Math.min(6, 2 + x.p.goals + x.p.assists), reasonOf(x.p.goals, x.p.assists));
    }
  }

  // Défense / gardien : meilleurs clubs de la semaine (clean sheets, victoires), 2 joueurs max par club
  const clubScore = (code: string) => {
    const w = clubWeek.get(code);
    return w ? w.cleanSheets * 4 + w.wins * 2 - w.goalsAgainst : -99;
  };
  const defenders = cards
    .filter((c) => (c.position === "DEF" || c.position === "GB") && clubWeek.has(c.club.code))
    .sort((a, b) => clubScore(b.club.code) - clubScore(a.club.code) || b.rating - a.rating);
  const perClub = new Map<string, number>();
  for (const pos of ["GB", "DEF"] as const) {
    const need = pos === "GB" ? 1 : 4;
    for (const c of defenders) {
      if (picks.filter((k) => k.position === pos).length >= need) break;
      if (c.position !== pos || used.has(c.templateId) || (perClub.get(c.club.code) ?? 0) >= 2) continue;
      const w = clubWeek.get(c.club.code)!;
      if (w.cleanSheets === 0 && w.wins === 0) continue;
      perClub.set(c.club.code, (perClub.get(c.club.code) ?? 0) + 1);
      const reason = [
        w.cleanSheets ? `${w.cleanSheets} clean sheet${w.cleanSheets > 1 ? "s" : ""}` : "",
        w.wins ? `${w.wins} victoire${w.wins > 1 ? "s" : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      take(c, Math.min(5, 2 + w.cleanSheets + (w.wins > 1 ? 1 : 0)), reason);
    }
  }

  // Compléments éventuels (semaine creuse) : meilleur joueur des clubs vainqueurs au poste manquant
  const need: Record<CatalogCard["position"], number> = { GB: 1, DEF: 4, MIL: 3, ATT: 3 };
  for (const pos of ["ATT", "MIL", "DEF", "GB"] as const) {
    const fill = cards
      .filter((c) => c.position === pos && !used.has(c.templateId) && (clubWeek.get(c.club.code)?.wins ?? 0) > 0)
      .sort((a, b) => clubScore(b.club.code) - clubScore(a.club.code) || b.rating - a.rating);
    // D'abord 2 joueurs par club au plus, limite levée seulement s'il manque encore du monde
    for (const strict of [true, false]) {
      for (const c of fill) {
        if (picks.filter((k) => k.position === pos).length >= need[pos]) break;
        if (used.has(c.templateId) || (strict && (perClub.get(c.club.code) ?? 0) >= 2)) continue;
        perClub.set(c.club.code, (perClub.get(c.club.code) ?? 0) + 1);
        take(c, 2, "victoire de son équipe");
      }
    }
  }
  return picks;
}
