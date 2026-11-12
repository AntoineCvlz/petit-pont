import { RARITIES, type Rarity } from "@/lib/rarity";

export const MARKET_TABS = {
  annonces: "Annonces",
  ventes: "Dernières ventes",
  recherchees: "Les plus recherchées",
  "mes-annonces": "Mes annonces",
} as const;
export type MarketTab = keyof typeof MARKET_TABS;

export const PRICE_BUCKETS = {
  "0-100": { label: "Jusqu'à 100", min: 0, max: 100 },
  "100-500": { label: "100 à 500", min: 100, max: 500 },
  "500-2000": { label: "500 à 2 000", min: 500, max: 2000 },
  "2000+": { label: "2 000 et plus", min: 2000, max: null },
} as const;
export type PriceBucket = keyof typeof PRICE_BUCKETS;

export const MARKET_SORTS = {
  recent: "Plus récentes",
  "prix-asc": "Prix croissant",
  "prix-desc": "Prix décroissant",
} as const;
export type MarketSort = keyof typeof MARKET_SORTS;

export type MarketQuery = {
  tab: MarketTab;
  q: string;
  rarity: Rarity | null;
  club: string | null;
  nation: string | null;
  price: PriceBucket | null;
  sort: MarketSort;
  page: number;
};

export const MARKET_PAGE_SIZE = 30;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseMarketQuery(params: Record<string, string | string[] | undefined>): MarketQuery {
  const tab = first(params.onglet);
  const rarity = first(params.rarete);
  const price = first(params.prix);
  const sort = first(params.tri);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    tab: tab && tab in MARKET_TABS ? (tab as MarketTab) : "annonces",
    q: (first(params.q) ?? "").trim().slice(0, 60),
    rarity: RARITIES.includes(rarity as Rarity) ? (rarity as Rarity) : null,
    club: first(params.club) || null,
    nation: first(params.nation) || null,
    price: price && price in PRICE_BUCKETS ? (price as PriceBucket) : null,
    sort: sort && sort in MARKET_SORTS ? (sort as MarketSort) : "recent",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

/**
 * Recherche joueur insensible aux accents, comparée à players.search_text
 * (nom affiché + prénom + nom, en minuscules sans accents).
 * Ne garde que lettres, chiffres et espaces simples : aucun caractère spécial
 * (%, _, virgule, parenthèse…) ne peut atteindre le filtre PostgREST.
 */
export function normalizeSearch(q: string): string {
  return q
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Commission arrondie à l'inférieur, comme dans buy_listing. */
export function marketFee(price: number, feePercent: number): number {
  return Math.floor((price * feePercent) / 100);
}

export function sellerNet(price: number, feePercent: number): number {
  return price - marketFee(price, feePercent);
}

/** Prix conseillé : dernier prix moyen constaté, sinon 3 × le prix de revente au système. */
export function suggestedPrice(avgPrice: number | null, systemPrice: number): number {
  if (avgPrice && avgPrice > 0) return avgPrice;
  return Math.max(1, systemPrice * 3);
}
