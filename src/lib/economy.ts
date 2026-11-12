import type { Database } from "@/types/database";
import { rarityRank, type Rarity } from "@/lib/rarity";

export type CoinTxType = Database["public"]["Enums"]["coin_tx_type"];

export const COIN_TX_LABELS: Record<CoinTxType, string> = {
  starting_balance: "Solde de bienvenue",
  daily_bonus: "Bonus quotidien",
  booster_purchase: "Achat de booster",
  duplicate_sale: "Revente de doublons",
  market_sale: "Vente sur le marché",
  market_purchase: "Achat sur le marché",
  album_reward: "Récompense d'album",
  trade_sent: "Pièces envoyées (échange)",
  trade_received: "Pièces reçues (échange)",
  admin_adjustment: "Ajustement",
};

export const COIN_TX_TYPES = Object.keys(COIN_TX_LABELS) as CoinTxType[];

export function isCoinTxType(v: unknown): v is CoinTxType {
  return typeof v === "string" && v in COIN_TX_LABELS;
}

export type DuplicateCopy = { templateId: number; serialNumber: number; rarity: Rarity; isLocked: boolean };

/**
 * Aperçu de la revente groupée, avec la même règle que la RPC sell_all_duplicates :
 * par carte, on garde l'exemplaire libre au plus petit numéro ; jamais d'exemplaire verrouillé.
 * (Affichage uniquement : le serveur recalcule.)
 */
export function previewBulkSale(
  copies: DuplicateCopy[],
  maxRarity: Rarity,
  prices: Partial<Record<Rarity, number>>,
): { count: number; coins: number } {
  const byTemplate = new Map<number, DuplicateCopy[]>();
  for (const c of copies) {
    if (c.isLocked || rarityRank(c.rarity) > rarityRank(maxRarity)) continue;
    const list = byTemplate.get(c.templateId) ?? [];
    list.push(c);
    byTemplate.set(c.templateId, list);
  }
  let count = 0;
  let coins = 0;
  for (const list of byTemplate.values()) {
    const extra = list.length - 1;
    if (extra > 0) {
      count += extra;
      coins += extra * (prices[list[0]!.rarity] ?? 0);
    }
  }
  return { count, coins };
}
