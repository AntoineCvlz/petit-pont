"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { formatCountdown } from "@/lib/boosters";

/**
 * Compte à rebours du booster gratuit (barre supérieure).
 * L'heure de disponibilité vient du serveur ; la RPC revérifie de toute façon à l'ouverture.
 */
export function FreeBoosterTimer({ slug, nextAt }: { slug: string; nextAt: string | null }) {
  const target = nextAt ? new Date(nextAt).getTime() : null;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Heure lue côté client uniquement (évite un écart d'hydratation avec le serveur)
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = target ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      if (id) clearInterval(id);
    };
  }, [target]);

  const remaining = target && now !== null ? target - now : 0;
  const ready = !target || (now !== null && remaining <= 0);

  return (
    <Link
      href={`/boosters/${slug}`}
      className={clsx(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors duration-150",
        ready ? "border-turf/50 bg-turf/15 font-semibold text-turf hover:bg-turf/25" : "border-line bg-night-850 text-chalk-muted hover:text-chalk",
      )}
      title={ready ? "Ton booster gratuit est prêt" : "Prochain booster gratuit"}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M7 3h10l-1 3 1 3-1 3 1 3-1 3 1 3H7l1-3-1-3 1-3-1-3 1-3z" />
      </svg>
      <span className="tabular-nums">
        {ready ? (
          <>
            <span className="sm:hidden">Prêt</span>
            <span className="hidden sm:inline">Booster gratuit</span>
          </>
        ) : now === null ? (
          "…"
        ) : (
          formatCountdown(remaining)
        )}
      </span>
    </Link>
  );
}
