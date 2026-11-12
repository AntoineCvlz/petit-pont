import type { Database } from "@/types/database";

export type TradeStatus = Database["public"]["Enums"]["trade_status"];

export const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Refusé",
  cancelled: "Annulé",
  expired: "Expiré",
  countered: "Contre-proposé",
};

export const TRADE_TABS = {
  recus: "Reçus",
  envoyes: "Envoyés",
  termines: "Terminés",
} as const;
export type TradeTab = keyof typeof TRADE_TABS;

export function parseTradeTab(v: unknown): TradeTab {
  return typeof v === "string" && v in TRADE_TABS ? (v as TradeTab) : "recus";
}

export const TRADE_MAX_ITEMS = 10;
export const TRADE_MAX_COINS = 1_000_000;

export type TradeDraft = { offered: string[]; requested: string[]; giveCoins: number; askCoins: number; message: string };

/** Validation côté client (confort) : la RPC propose_trade revérifie tout. */
export function tradeDraftError(d: TradeDraft, myCoins: number): string | null {
  if (d.offered.length + d.requested.length === 0) return "Ajoute au moins une carte à l'échange.";
  if (d.offered.length > TRADE_MAX_ITEMS || d.requested.length > TRADE_MAX_ITEMS) {
    return `Maximum ${TRADE_MAX_ITEMS} cartes de chaque côté.`;
  }
  for (const c of [d.giveCoins, d.askCoins]) {
    if (!Number.isInteger(c) || c < 0 || c > TRADE_MAX_COINS) return "Montant de pièces invalide.";
  }
  if (d.giveCoins > myCoins) return "Tu n'as pas assez de pièces pour cette offre.";
  if (d.message.length > 280) return "Message trop long (280 caractères max).";
  return null;
}

/** « dans 3 jours », « dans 5 h » : temps restant avant expiration. */
export function expiresIn(iso: string, now: Date = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "expiré";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `expire dans ${Math.floor(h / 24)} jours`;
  if (h >= 1) return `expire dans ${h} h`;
  return `expire dans ${Math.max(1, Math.floor(ms / 60_000))} min`;
}
