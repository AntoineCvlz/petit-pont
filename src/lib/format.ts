const coinFormatter = new Intl.NumberFormat("fr-FR");

export function formatCoins(amount: number): string {
  return coinFormatter.format(amount);
}

/** « 042/170 » : numéro de collection complété selon la taille du total. */
export function formatCollectionNumber(n: number, total: number): string {
  const width = Math.max(3, String(total).length);
  return `${String(n).padStart(width, "0")}/${String(total).padStart(width, "0")}`;
}

/** « #12/50 » pour un tirage limité, « #12 » sinon. */
export function formatSerial(serial: number, maxSupply: number | null): string {
  return maxSupply ? `#${serial}/${maxSupply}` : `#${serial}`;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** « il y a 3 heures », « hier »… */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

export function initials(name: string): string {
  return name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
