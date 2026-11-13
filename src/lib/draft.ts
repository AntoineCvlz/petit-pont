/**
 * Collectif du mode Draft (même règles que la base : _draft_link / _draft_chemistry).
 *   vert (2)   = même club, ou même ligue ET même nation
 *   orange (1) = même ligue OU même nation
 *   rouge (0)  = rien en commun
 * Chaque joueur vaut round(10 × force moyenne de ses liens), vert = 1, orange = 0,5 ; total plafonné à 100.
 * Côté client, sert à l'affichage en direct ; le score officiel est calculé par la base.
 */

export type DraftSlot = {
  key: string;
  label: string;
  pos: "GB" | "DEF" | "MIL" | "ATT";
  x: number;
  y: number;
};
export type DraftFormation = {
  code: string;
  name: string;
  slots: DraftSlot[];
  links: [string, string][];
};
export type LinkIdentity = {
  club: string | null;
  league: string | null;
  nation: string;
};
export type LinkStrength = 0 | 1 | 2;

export function linkStrength(a: LinkIdentity, b: LinkIdentity): LinkStrength {
  if (a.club !== null && a.club === b.club) return 2;
  const sameLeague = a.league !== null && a.league === b.league;
  const sameNation = a.nation === b.nation;
  if (sameLeague && sameNation) return 2;
  if (sameLeague || sameNation) return 1;
  return 0;
}

export type DraftLink = { a: string; b: string; strength: LinkStrength | null };

/** Liens de la formation ; strength = null tant qu'un des deux postes est vide. */
export function draftLinks(formation: DraftFormation, picks: Partial<Record<string, LinkIdentity>>): DraftLink[] {
  return formation.links.map(([a, b]) => {
    const pa = picks[a];
    const pb = picks[b];
    return { a, b, strength: pa && pb ? linkStrength(pa, pb) : null };
  });
}

/** Collectif par joueur (0 à 10) et total (0 à 100) sur les postes déjà pourvus. */
export function draftChemistry(
  formation: DraftFormation,
  picks: Partial<Record<string, LinkIdentity>>,
): { total: number; perSlot: Record<string, number> } {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const l of draftLinks(formation, picks)) {
    if (l.strength === null) continue;
    for (const slot of [l.a, l.b]) {
      const cur = sums.get(slot) ?? { sum: 0, n: 0 };
      cur.sum += l.strength;
      cur.n += 1;
      sums.set(slot, cur);
    }
  }
  const perSlot: Record<string, number> = {};
  let total = 0;
  for (const [slot, { sum, n }] of sums) {
    // Arrondi « au demi supérieur » comme round() de PostgreSQL sur un numeric
    const chem = Math.floor((10 * sum) / n / 2 + 0.5 + 1e-9);
    perSlot[slot] = chem;
    total += chem;
  }
  return { total: Math.min(100, total), perSlot };
}

export function draftScore(rating: number, chemistry: number): number {
  return Math.round((rating + chemistry / 20) * 100) / 100;
}

export const LINK_COLORS: Record<LinkStrength, string> = {
  2: "#4ade80",
  1: "#f5a524",
  0: "#ef4444",
};
export const LINK_LABELS: Record<LinkStrength, string> = {
  2: "lien fort",
  1: "lien moyen",
  0: "aucun lien",
};
