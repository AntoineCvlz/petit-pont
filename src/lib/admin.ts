import { RARITIES, type Rarity } from "@/lib/rarity";

/** Lecture typée d'un formulaire d'administration (la base revalide tout via contraintes et RLS). */
export class FormReader {
  constructor(private readonly fd: FormData) {}

  text(name: string, { required = false, max = 500 } = {}): string | null {
    const raw = this.fd.get(name);
    const v = typeof raw === "string" ? raw.trim() : "";
    if (!v) {
      if (required) throw new FormError(`Le champ « ${name} » est obligatoire.`);
      return null;
    }
    if (v.length > max) throw new FormError(`« ${name} » : ${max} caractères maximum.`);
    return v;
  }

  int(name: string, { required = false, min = -Infinity, max = Infinity } = {}): number | null {
    const v = this.text(name, { required });
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new FormError(`« ${name} » doit être un entier entre ${min} et ${max}.`);
    return n;
  }

  bool(name: string): boolean {
    return this.fd.get(name) === "on" || this.fd.get(name) === "true";
  }

  oneOf<T extends string>(name: string, allowed: readonly T[], { required = false } = {}): T | null {
    const v = this.text(name, { required });
    if (v === null) return null;
    if (!allowed.includes(v as T)) throw new FormError(`Valeur invalide pour « ${name} ».`);
    return v as T;
  }

  /** Date/heure locale (input datetime-local) → ISO, interprétée en heure de Paris. */
  dateTime(name: string): string | null {
    const v = this.text(name);
    if (v === null) return null;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) throw new FormError(`« ${name} » : date invalide.`);
    return parisLocalToIso(v);
  }
}

export class FormError extends Error {}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** « 12, 45 46\n47 » → [12, 45, 46, 47] ; erreur si un élément n'est pas un entier positif. */
export function parseCollectionNumbers(text: string): number[] {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  const nums = parts.map((p) => Number(p));
  const bad = parts.filter((_, i) => !Number.isInteger(nums[i]) || nums[i]! <= 0);
  if (bad.length) throw new FormError(`Numéros invalides : ${bad.join(", ")}`);
  return nums;
}

export type OddsInput = Partial<Record<Rarity, number>>;

/** Total au centième près (évite les erreurs d'arrondi flottant). */
export function oddsTotal(odds: OddsInput): number {
  return RARITIES.reduce((sum, r) => sum + Math.round((odds[r] ?? 0) * 100), 0) / 100;
}

export function oddsError(odds: OddsInput): string | null {
  for (const r of RARITIES) {
    const v = odds[r] ?? 0;
    // Au plus 2 décimales, avec tolérance flottante (2,3 × 100 = 229,999…)
    if (!Number.isFinite(v) || v < 0 || v > 100 || Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) {
      return "Chaque probabilité doit être entre 0 et 100, avec 2 décimales au plus.";
    }
  }
  const total = oddsTotal(odds);
  return total === 100 ? null : `Le total doit faire 100 % (actuellement ${total.toLocaleString("fr-FR")} %).`;
}

/** « 2026-11-20T18:30 » (heure de Paris) → ISO UTC. */
export function parisLocalToIso(local: string): string {
  const [date, time] = local.split("T") as [string, string];
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Décalage de Paris à cet instant (CET/CEST)
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asParis = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asParis - guess)).toISOString();
}

/** ISO → valeur d'input datetime-local en heure de Paris. */
export function isoToParisLocal(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}

/** Libellé lisible d'une action du journal d'administration. */
export function describeAdminAction(action: string, details: Record<string, unknown>): string {
  const n = typeof details.count === "number" ? details.count : 1;
  const reason = typeof details.reason === "string" && details.reason ? ` (« ${details.reason} »)` : "";
  switch (action) {
    case "give_boosters":
      return `${n} pack${n > 1 ? "s" : ""} « ${String(details.booster ?? "?")} » offert${n > 1 ? "s" : ""}${reason}`;
    case "give_cards":
      return `${n} exemplaire${n > 1 ? "s" : ""} de ${String(details.card ?? "?")} offert${n > 1 ? "s" : ""}${reason}`;
    case "adjust_coins": {
      const amount = typeof details.amount === "number" ? details.amount : 0;
      return `${amount > 0 ? "+" : ""}${amount} pièces${reason}`;
    }
    case "remove_cards": {
      const cards = Array.isArray(details.cards) ? (details.cards as { card?: string; serial?: number }[]) : [];
      const list = cards.map((c) => `${c.card ?? "?"} #${c.serial ?? "?"}`).join(", ");
      return `Carte${cards.length > 1 ? "s" : ""} retirée${cards.length > 1 ? "s" : ""} : ${list || "?"}${reason}`;
    }
    case "reset_account":
      return `Compte réinitialisé (${String(details.cards_removed ?? 0)} cartes, ${String(details.coins_before ?? "?")} pièces avant)${reason}`;
    case "ban":
      return `Banni${reason}`;
    case "unban":
      return `Bannissement levé${reason}`;
    default:
      return action;
  }
}
