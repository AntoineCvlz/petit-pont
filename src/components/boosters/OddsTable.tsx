import { formatProbability, type Odds } from "@/lib/boosters";
import { RARITY_LABELS } from "@/lib/rarity";

export function OddsTable({ odds, compact = false }: { odds: Odds; compact?: boolean }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Probabilités par rareté, pour chaque carte tirée</caption>
      <tbody>
        {odds.map((o) => (
          <tr key={o.rarity} className="border-b border-line/60 last:border-0">
            <th scope="row" className={compact ? "py-0.5 text-left font-normal" : "py-1.5 text-left font-normal"}>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--color-r-${o.rarity})` }} aria-hidden="true" />
                {RARITY_LABELS[o.rarity]}
              </span>
            </th>
            <td className="py-0.5 text-right tabular-nums text-chalk-muted">{formatProbability(o.probability)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
