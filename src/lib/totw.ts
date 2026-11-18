/**
 * Équipe de la semaine : sélection d'un 4-3-3 à partir des performances réelles des matchs joués entre les deux derniers
 * mercredis 19h (championnats, coupes d'Europe, sélections nationales), rapprochées du catalogue.
 * Fonctions pures (testées) ; la récupération des données est dans la route /api/cron/totw.
 */

/** Compétitions gratuites de football-data.org → code de ligue du catalogue (source de secours). */
export const FD_COMPETITIONS: Record<string, string> = { FL1: "L1", PL: "PL", PD: "LL", SA: "SA", BL1: "BL" };

/** Équipe réelle : un club (ligue du catalogue si connue) ou une sélection nationale (code FIFA). */
export type RealTeam = { name: string; shortName?: string | null; tla?: string | null };
export type Scope = { kind: "club"; league: string | null } | { kind: "nation"; code: string };

/** Performance offensive de la semaine d'un joueur réel. */
export type Performer = {
  name: string;
  dateOfBirth?: string | null;
  team: RealTeam;
  scope: Scope;
  goals: number;
  assists: number;
};

/** Résultats de la semaine d'une équipe réelle. */
export type TeamWeek = { team: RealTeam; scope: Scope; played: number; wins: number; cleanSheets: number; goalsAgainst: number };

/** Carte de base du catalogue. */
export type CatalogCard = {
  templateId: number;
  rating: number;
  position: "GB" | "DEF" | "MIL" | "ATT";
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  birthdate?: string | null;
  club: { code: string; name: string; shortName?: string | null };
  league: string | null;
  nation: string;
};

export type TotwPick = { templateId: number; boost: number; reason: string; position: CatalogCard["position"] };

/**
 * Note minimale pour figurer dans l'équipe : évite qu'un triplé contre une petite sélection place un joueur noté 60
 * devant les cadors (le rapprochement des noms, lui, se fait sur tout le catalogue).
 */
export const TOTW_MIN_RATING = 72;

export function normalizeName(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CLUB_NOISE =
  /\b(fc|cf|ac|as|ssc|afc|sc|sv|vfb|vfl|tsg|rc|ogc|losc|stade|club|de|calcio|1|fk|ud|cd|rcd|real club|hotspur|and|hove|albion|united|city)\b/g;
function clubKey(v: string): string {
  return normalizeName(v).replace(CLUB_NOISE, " ").replace(/\s+/g, " ").trim();
}

/** Club du catalogue correspondant à une équipe réelle (nom, nom court ou sigle). */
export function matchClub(team: RealTeam, clubs: CatalogCard["club"][]): string | null {
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
  return best?.code ?? null;
}

/** Carte du catalogue correspondant à un joueur réel, cherchée parmi `pool` (même club ou même nation). */
export function matchPlayer(p: Pick<Performer, "name" | "dateOfBirth">, pool: CatalogCard[]): CatalogCard | null {
  const n = normalizeName(p.name);
  const last = n.split(" ").at(-1) ?? n;
  const byDob = p.dateOfBirth ? pool.filter((c) => c.birthdate === p.dateOfBirth) : [];
  if (byDob.length === 1) return byDob[0]!;
  const sameName = (byDob.length ? byDob : pool).filter((c) => {
    const full = normalizeName(c.name);
    const ln = normalizeName(c.lastName ?? "");
    return full === n || (ln && (ln === last || n.endsWith(` ${ln}`))) || full.split(" ").at(-1) === last;
  });
  // Nom complet identique d'abord, sinon le mieux noté des homonymes
  const exact = sameName.filter((c) => normalizeName(c.name) === n);
  const list = exact.length ? exact : sameName;
  return list.sort((a, b) => b.rating - a.rating)[0] ?? null;
}

/** 4-3-3 de la semaine : attaque et milieu sur buts + passes, défense et gardien sur clean sheets et victoires. */
export function selectTotw(performers: Performer[], teams: TeamWeek[], cards: CatalogCard[]): TotwPick[] {
  const allClubs: CatalogCard["club"][] = [];
  const clubsByLeague = new Map<string, CatalogCard["club"][]>();
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c.club.code)) continue;
    seen.add(c.club.code);
    allClubs.push(c.club);
    if (c.league) clubsByLeague.set(c.league, [...(clubsByLeague.get(c.league) ?? []), c.club]);
  }
  /** Clé de groupe (club du catalogue ou sélection) d'une équipe réelle. */
  const groupOf = (team: RealTeam, scope: Scope): string | null => {
    if (scope.kind === "nation") return `N:${scope.code}`;
    const code = matchClub(team, scope.league ? (clubsByLeague.get(scope.league) ?? allClubs) : allClubs);
    return code ? `C:${code}` : null;
  };
  const cardsOf = (group: string) =>
    group.startsWith("N:") ? cards.filter((c) => c.nation === group.slice(2)) : cards.filter((c) => c.club.code === group.slice(2));

  // Résultats de la semaine par groupe (un joueur cumule son club et sa sélection)
  const week = new Map<string, Omit<TeamWeek, "team" | "scope">>();
  for (const t of teams) {
    const g = groupOf(t.team, t.scope);
    if (!g) continue;
    const w = week.get(g) ?? { played: 0, wins: 0, cleanSheets: 0, goalsAgainst: 0 };
    w.played += t.played;
    w.wins += t.wins;
    w.cleanSheets += t.cleanSheets;
    w.goalsAgainst += t.goalsAgainst;
    week.set(g, w);
  }
  const cardWeek = (c: CatalogCard) => {
    const total = { played: 0, wins: 0, cleanSheets: 0, goalsAgainst: 0 };
    for (const g of [`C:${c.club.code}`, `N:${c.nation}`]) {
      const w = week.get(g);
      if (!w) continue;
      total.played += w.played;
      total.wins += w.wins;
      total.cleanSheets += w.cleanSheets;
      total.goalsAgainst += w.goalsAgainst;
    }
    return total;
  };

  const used = new Set<number>();
  const picks: TotwPick[] = [];
  const take = (card: CatalogCard, boost: number, reason: string) => {
    if (card.rating < TOTW_MIN_RATING) return;
    used.add(card.templateId);
    picks.push({ templateId: card.templateId, boost, reason, position: card.position });
  };
  const count = (pos: CatalogCard["position"]) => picks.filter((k) => k.position === pos).length;

  // Attaque / milieu : buts × 4 + passes × 3, cumulés club + sélection
  const totals = new Map<number, { card: CatalogCard; goals: number; assists: number }>();
  for (const p of performers) {
    const g = groupOf(p.team, p.scope);
    if (!g) continue;
    const card = matchPlayer(p, cardsOf(g));
    if (!card) continue;
    const t = totals.get(card.templateId) ?? { card, goals: 0, assists: 0 };
    t.goals += p.goals;
    t.assists += p.assists;
    totals.set(card.templateId, t);
  }
  const attackers = [...totals.values()]
    .filter((x) => x.goals + x.assists > 0)
    .sort((a, b) => b.goals * 4 + b.assists * 3 - (a.goals * 4 + a.assists * 3) || b.card.rating - a.card.rating);
  const reasonOf = (g: number, a: number) =>
    [g ? `${g} but${g > 1 ? "s" : ""}` : "", a ? `${a} passe${a > 1 ? "s" : ""} déc.` : ""].filter(Boolean).join(", ");
  for (const pos of ["ATT", "MIL"] as const) {
    for (const x of attackers) {
      if (count(pos) >= 3) break;
      if (x.card.position !== pos || used.has(x.card.templateId) || x.card.rating < TOTW_MIN_RATING) continue;
      take(x.card, Math.min(6, 2 + x.goals + x.assists), reasonOf(x.goals, x.assists));
    }
  }

  // Défense / gardien : meilleures équipes de la semaine (clean sheets, victoires), 2 joueurs max par club
  const score = (c: CatalogCard) => {
    const w = cardWeek(c);
    return w.played ? w.cleanSheets * 4 + w.wins * 2 - w.goalsAgainst : -99;
  };
  const backline = cards
    .filter((c) => (c.position === "DEF" || c.position === "GB") && c.rating >= TOTW_MIN_RATING && cardWeek(c).played > 0)
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s || b.c.rating - a.c.rating);
  const perClub = new Map<string, number>();
  const weekReason = (c: CatalogCard) => {
    const w = cardWeek(c);
    return [
      w.cleanSheets ? `${w.cleanSheets} clean sheet${w.cleanSheets > 1 ? "s" : ""}` : "",
      w.wins ? `${w.wins} victoire${w.wins > 1 ? "s" : ""}` : "",
    ]
      .filter(Boolean)
      .join(", ");
  };
  for (const pos of ["GB", "DEF"] as const) {
    const need = pos === "GB" ? 1 : 4;
    for (const { c } of backline) {
      if (count(pos) >= need) break;
      const w = cardWeek(c);
      if (c.position !== pos || used.has(c.templateId) || (perClub.get(c.club.code) ?? 0) >= 2) continue;
      if (w.cleanSheets === 0 && w.wins === 0) continue;
      perClub.set(c.club.code, (perClub.get(c.club.code) ?? 0) + 1);
      take(c, Math.min(5, 2 + w.cleanSheets + (w.wins > 1 ? 1 : 0)), weekReason(c));
    }
  }

  // Compléments (semaine creuse) : meilleurs joueurs des équipes victorieuses au poste manquant
  const need: Record<CatalogCard["position"], number> = { GB: 1, DEF: 4, MIL: 3, ATT: 3 };
  for (const pos of ["ATT", "MIL", "DEF", "GB"] as const) {
    const fill = cards
      .filter((c) => c.position === pos && c.rating >= TOTW_MIN_RATING && !used.has(c.templateId) && cardWeek(c).wins > 0)
      .sort((a, b) => score(b) - score(a) || b.rating - a.rating);
    for (const strict of [true, false]) {
      for (const c of fill) {
        if (count(pos) >= need[pos]) break;
        if (used.has(c.templateId) || (strict && (perClub.get(c.club.code) ?? 0) >= 2)) continue;
        perClub.set(c.club.code, (perClub.get(c.club.code) ?? 0) + 1);
        take(c, 2, weekReason(c) || "victoire de son équipe");
      }
    }
  }
  return picks;
}
