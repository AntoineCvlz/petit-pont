import { formatProbability, type Odds } from "@/lib/boosters";
import { RARITY_LABELS } from "@/lib/rarity";

/**
 * Probabilités en version compacte (liste des boosters) : barre segmentée aux couleurs des raretés
 * et légende limitée aux raretés possibles. Le tableau complet reste sur la page du booster.
 */
export function OddsBar({ odds }: { odds: Odds }) {
  const shown = odds.filter((o) => o.probability > 0);
  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-night-700"
        role="img"
        aria-label={`Probabilités par carte : ${shown.map((o) => `${RARITY_LABELS[o.rarity]} ${formatProbability(o.probability)}`).join(", ")}`}
      >
        {shown.map((o) => (
          <span
            key={o.rarity}
            className="h-full border-r border-night-900 last:border-r-0"
            style={{ width: `${o.probability}%`, minWidth: 3, background: `var(--color-r-${o.rarity})` }}
          />
        ))}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-chalk-muted" aria-hidden="true">
        {shown.map((o) => (
          <li key={o.rarity} className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--color-r-${o.rarity})` }} />
            {RARITY_LABELS[o.rarity]} <span className="tabular-nums text-chalk">{formatProbability(o.probability)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
