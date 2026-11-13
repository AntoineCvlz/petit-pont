/**
 * Défis d'équipe : description et vérification côté client des conditions (mêmes règles que _sbc_check).
 * Sert à l'affichage en direct ; la base revérifie tout à la validation.
 */
import { RARITY_LABELS, rarityRank, type Rarity } from "@/lib/rarity";

export type SbcRequirements = {
  count?: number;
  league?: string;
  nation?: string;
  club?: string;
  min_avg_rating?: number;
  min_rarity?: { rarity: Rarity; count: number };
  distinct_nations?: number;
  distinct_clubs?: number;
};

export type SbcCard = {
  rating: number;
  rarity: Rarity;
  nation: string;
  club: string | null;
  league: string | null;
};

export type SbcCheck = { label: string; ok: boolean };

export function sbcChecks(
  r: SbcRequirements,
  cards: SbcCard[],
  names: { leagues: Record<string, string>; nations: Record<string, string> } = { leagues: {}, nations: {} },
): SbcCheck[] {
  const checks: SbcCheck[] = [];
  if (r.count !== undefined) checks.push({ label: `${cards.length}/${r.count} cartes`, ok: cards.length === r.count });
  if (r.league) {
    const name = names.leagues[r.league] ?? r.league;
    checks.push({ label: `Toutes de ${name}`, ok: cards.length > 0 && cards.every((c) => c.league === r.league) });
  }
  if (r.nation) {
    const name = names.nations[r.nation] ?? r.nation;
    checks.push({ label: `Tous ${name}`, ok: cards.length > 0 && cards.every((c) => c.nation === r.nation) });
  }
  if (r.club) checks.push({ label: "Tous du même club", ok: cards.length > 0 && cards.every((c) => c.club === r.club) });
  if (r.min_avg_rating !== undefined) {
    const avg = cards.length ? cards.reduce((s, c) => s + c.rating, 0) / cards.length : 0;
    checks.push({
      label: `Note moyenne ${avg.toFixed(1)} / ${r.min_avg_rating}`,
      ok: cards.length > 0 && avg >= r.min_avg_rating,
    });
  }
  if (r.min_rarity) {
    const n = cards.filter((c) => rarityRank(c.rarity) >= rarityRank(r.min_rarity!.rarity)).length;
    checks.push({
      label: `${n}/${r.min_rarity.count} ${RARITY_LABELS[r.min_rarity.rarity]}${r.min_rarity.count > 1 ? "s" : ""} ou mieux`,
      ok: n >= r.min_rarity.count,
    });
  }
  if (r.distinct_nations !== undefined) {
    const n = new Set(cards.map((c) => c.nation)).size;
    checks.push({ label: `${n}/${r.distinct_nations} nations différentes`, ok: n >= r.distinct_nations });
  }
  if (r.distinct_clubs !== undefined) {
    const n = new Set(cards.map((c) => c.club)).size;
    checks.push({ label: `${n}/${r.distinct_clubs} clubs différents`, ok: n >= r.distinct_clubs });
  }
  return checks;
}

/** Une carte peut-elle compter pour ce défi (filtre « cartes éligibles ») ? */
export function sbcEligible(r: SbcRequirements, c: SbcCard): boolean {
  if (r.league && c.league !== r.league) return false;
  if (r.nation && c.nation !== r.nation) return false;
  if (r.club && c.club !== r.club) return false;
  return true;
}

export const REPEAT_LABELS: Record<string, string> = {
  once: "Une seule fois",
  daily: "Chaque jour",
  weekly: "Chaque semaine",
  unlimited: "Illimité",
};
