import type { Database } from "@/types/database";

export type Rarity = Database["public"]["Enums"]["rarity"];
export type PlayerPosition = Database["public"]["Enums"]["player_position"];

export const RARITIES: readonly Rarity[] = ["commune", "rare", "epique", "legendaire", "iconique", "speciale"];

export const RARITY_LABELS: Record<Rarity, string> = {
  commune: "Commune",
  rare: "Rare",
  epique: "Épique",
  legendaire: "Légendaire",
  iconique: "Iconique",
  speciale: "Spéciale",
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  GB: "Gardien",
  DEF: "Défenseur",
  MIL: "Milieu",
  ATT: "Attaquant",
};

/** Rang 1 (commune) à 6 (spéciale), identique à la fonction SQL rarity_rank. */
export function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r) + 1;
}

/** Brillance discrète à partir de Rare. */
export function hasShine(r: Rarity): boolean {
  return rarityRank(r) >= rarityRank("rare");
}

/** Raretés qui déclenchent un événement public dans le fil d'activité. */
export function isPublicPull(r: Rarity): boolean {
  return rarityRank(r) >= rarityRank("legendaire");
}

export function compareRarityDesc(a: Rarity, b: Rarity): number {
  return rarityRank(b) - rarityRank(a);
}
