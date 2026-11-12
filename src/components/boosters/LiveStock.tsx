"use client";

import { useEffect, useState } from "react";
import { subscribeToChanges } from "@/lib/realtime";

/** Compteur de stock d'un booster limité, mis à jour en direct (Supabase Realtime). */
export function LiveStock({ boosterId, initial, total }: { boosterId: number; initial: number; total: number }) {
  // Valeur poussée par Realtime ; à défaut, celle rendue par le serveur.
  const [live, setLive] = useState<number | null>(null);
  const stock = live ?? initial;

  useEffect(
    () =>
      subscribeToChanges({ table: "boosters", event: "UPDATE", filter: `id=eq.${boosterId}` }, (payload) => {
        const next = (payload.new as { stock_remaining?: number | null }).stock_remaining;
        if (typeof next === "number") setLive(next);
      }),
    [boosterId],
  );

  const pct = total ? (stock / total) * 100 : 0;
  return (
    <div aria-live="polite">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-chalk-muted">Stock restant</span>
        <span className="font-semibold tabular-nums">
          {stock} / {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-night-700">
        <div className="h-full rounded-full bg-r-iconique transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
