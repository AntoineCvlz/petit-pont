"use client";

import { useState } from "react";
import { oddsError, oddsTotal, type OddsInput } from "@/lib/admin";
import { RARITIES, RARITY_LABELS, type Rarity } from "@/lib/rarity";

/** Probabilités par rareté avec total en direct (la RPC refuse tout total ≠ 100 %). */
export function OddsEditor({ initial }: { initial: Partial<Record<Rarity, number>> }) {
  const [values, setValues] = useState<Record<Rarity, string>>(
    Object.fromEntries(RARITIES.map((r) => [r, String(initial[r] ?? 0)])) as Record<Rarity, string>,
  );
  const parsed: OddsInput = Object.fromEntries(RARITIES.map((r) => [r, Number(values[r].replace(",", ".") || 0)]));
  const total = oddsTotal(parsed);
  const error = oddsError(parsed);

  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-xs font-semibold tracking-wide text-chalk-muted uppercase">Probabilités par carte (%)</legend>
      <div className="grid grid-cols-3 gap-2">
        {RARITIES.map((r) => (
          <label key={r} className="block">
            <span className="mb-0.5 block text-xs" style={{ color: `var(--color-r-${r})` }}>
              {RARITY_LABELS[r]}
            </span>
            <input
              name={`odds_${r}`}
              inputMode="decimal"
              value={values[r]}
              onChange={(e) => setValues((v) => ({ ...v, [r]: e.target.value }))}
              className="h-8 w-full rounded-lg border border-line-strong bg-night-900 px-2 text-sm tabular-nums focus:border-turf focus:outline-none"
            />
          </label>
        ))}
      </div>
      <p className={error ? "mt-2 text-xs text-danger" : "mt-2 text-xs text-success"} aria-live="polite">
        Total : {total.toLocaleString("fr-FR")} %{error ? ` — ${error}` : " ✓"}
      </p>
    </fieldset>
  );
}
