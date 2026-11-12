import type { Database } from "@/types/database";
import { RARITIES, type Rarity } from "@/lib/rarity";

export type BoosterKind = Database["public"]["Enums"]["booster_kind"];

export const BOOSTER_KIND_LABELS: Record<BoosterKind, string> = {
  free: "Gratuit",
  standard: "Standard",
  premium: "Premium",
  event: "Événement",
  limited: "Édition limitée",
};

export type Availability =
  | { available: true }
  | { available: false; reason: "inactive" | "ended" | "sold_out" }
  | { available: false; reason: "not_started"; startsAt: string }
  | { available: false; reason: "cooldown"; nextAt: string };

export function parseAvailability(raw: unknown): Availability {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (r.available === true) return { available: true };
  switch (r.reason) {
    case "cooldown":
      return { available: false, reason: "cooldown", nextAt: String(r.next_at) };
    case "not_started":
      return { available: false, reason: "not_started", startsAt: String(r.starts_at) };
    case "ended":
    case "sold_out":
      return { available: false, reason: r.reason };
    default:
      return { available: false, reason: "inactive" };
  }
}

export function availabilityLabel(a: Availability): string | null {
  if (a.available) return null;
  switch (a.reason) {
    case "cooldown":
      return "En recharge";
    case "not_started":
      return "Bientôt disponible";
    case "ended":
      return "Événement terminé";
    case "sold_out":
      return "Épuisé";
    default:
      return "Indisponible";
  }
}

export type Odds = { rarity: Rarity; probability: number }[];

/** Probabilités complètes et triées (raretés absentes = 0 %). */
export function normalizeOdds(rows: { rarity: Rarity; probability: number | string }[]): Odds {
  return RARITIES.map((rarity) => ({
    rarity,
    probability: Number(rows.find((r) => r.rarity === rarity)?.probability ?? 0),
  }));
}

export function formatProbability(p: number): string {
  if (p === 0) return "—";
  return `${p.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

/** Prix de revente au système des doublons sélectionnés. */
export function duplicatesValue(rarities: Rarity[], prices: Partial<Record<Rarity, number>>): number {
  return rarities.reduce((sum, r) => sum + (prices[r] ?? 0), 0);
}

/** « 2 h 05 », « 12 min », « 45 s » */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  if (m > 0) return `${m} min ${String(s).padStart(2, "0")}`;
  return `${s} s`;
}
