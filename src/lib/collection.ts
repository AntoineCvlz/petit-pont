import type { CardTemplateView } from "@/lib/data/cards";
import { RARITIES, rarityRank, type PlayerPosition, type Rarity } from "@/lib/rarity";

export const SORTS = {
  rarete: "Rareté",
  note: "Note",
  date: "Date d'obtention",
  numero: "Numéro",
  nom: "Nom",
} as const;
export type CollectionSort = keyof typeof SORTS;

export type CollectionQuery = {
  q: string;
  rarity: Rarity | null;
  club: string | null;
  nation: string | null;
  position: PlayerPosition | null;
  sort: CollectionSort;
  duplicatesOnly: boolean;
};

const POSITIONS: readonly PlayerPosition[] = ["GB", "DEF", "MIL", "ATT"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Lit les filtres depuis l'URL ; toute valeur inconnue est ignorée. */
export function parseCollectionQuery(params: Record<string, string | string[] | undefined>): CollectionQuery {
  const rarity = first(params.rarete);
  const position = first(params.poste);
  const sort = first(params.tri);
  return {
    q: (first(params.q) ?? "").trim().slice(0, 60),
    rarity: RARITIES.includes(rarity as Rarity) ? (rarity as Rarity) : null,
    club: first(params.club) || null,
    nation: first(params.nation) || null,
    position: POSITIONS.includes(position as PlayerPosition) ? (position as PlayerPosition) : null,
    sort: sort && sort in SORTS ? (sort as CollectionSort) : "rarete",
    duplicatesOnly: first(params.doublons) === "1",
  };
}

/** Insensible aux accents et à la casse : « mbappe » trouve « Mbappé ». */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export type CollectionItem = {
  template: CardTemplateView;
  copies: number;
  lastObtainedAt: string;
};

export function applyCollectionQuery<T extends CollectionItem>(items: T[], query: CollectionQuery): T[] {
  const q = normalizeText(query.q);
  const filtered = items.filter((it) => {
    const t = it.template;
    if (q && !normalizeText(`${t.playerName} ${t.club?.name ?? ""} ${t.nation.name} ${t.edition}`).includes(q)) return false;
    if (query.rarity && t.rarity !== query.rarity) return false;
    if (query.club && t.club?.code !== query.club) return false;
    if (query.nation && t.nation.code !== query.nation) return false;
    if (query.position && t.position !== query.position) return false;
    if (query.duplicatesOnly && it.copies < 2) return false;
    return true;
  });

  const byNumber = (a: T, b: T) => a.template.collectionNumber - b.template.collectionNumber;
  const comparators: Record<CollectionSort, (a: T, b: T) => number> = {
    rarete: (a, b) =>
      rarityRank(b.template.rarity) - rarityRank(a.template.rarity) || b.template.rating - a.template.rating || byNumber(a, b),
    note: (a, b) => b.template.rating - a.template.rating || byNumber(a, b),
    date: (a, b) => b.lastObtainedAt.localeCompare(a.lastObtainedAt) || byNumber(a, b),
    numero: byNumber,
    nom: (a, b) => a.template.playerName.localeCompare(b.template.playerName, "fr") || byNumber(a, b),
  };
  return [...filtered].sort(comparators[query.sort]);
}

/** Options de filtre construites à partir de ce que le joueur possède réellement. */
export function filterOptions(items: CollectionItem[]) {
  const clubs = new Map<string, string>();
  const nations = new Map<string, string>();
  for (const { template: t } of items) {
    if (t.club) clubs.set(t.club.code, t.club.name);
    nations.set(t.nation.code, t.nation.name);
  }
  const sorted = (m: Map<string, string>) =>
    [...m].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return { clubs: sorted(clubs), nations: sorted(nations) };
}
