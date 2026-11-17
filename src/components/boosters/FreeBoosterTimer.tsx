"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { formatCountdown } from "@/lib/boosters";

/** Heure courante côté client uniquement (évite un écart d'hydratation), rafraîchie chaque seconde si besoin. */
function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = active ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      if (id) clearInterval(id);
    };
  }, [active]);
  return now;
}

/** Compte à rebours jusqu'au prochain booster gratuit débloqué. */
export function FreeBoosterCountdown({ nextAt }: { nextAt: string }) {
  const target = new Date(nextAt).getTime();
  const now = useNow(true);
  return <span className="font-semibold text-chalk tabular-nums">{now === null ? "…" : formatCountdown(Math.max(0, target - now))}</span>;
}

/**
 * Boosters gratuits en réserve (barre supérieure) : nombre prêt, sinon compte à rebours du suivant.
 * Les valeurs viennent du serveur ; la RPC revérifie de toute façon à l'ouverture.
 */
export function FreeBoosterTimer({
  slug,
  stock,
  cap,
  nextAt,
}: {
  slug: string;
  stock: number;
  cap: number;
  nextAt: string | null;
}) {
  const target = nextAt ? new Date(nextAt).getTime() : null;
  const now = useNow(target !== null);
  const unlocked = target !== null && now !== null && now >= target ? 1 : 0;
  const ready = Math.min(cap, stock + unlocked);

  return (
    <Link
      href={`/boosters/${slug}`}
      className={clsx(
        "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-sm whitespace-nowrap transition-colors duration-150 sm:gap-1.5 sm:px-2.5",
        ready > 0
          ? "border-turf/50 bg-turf/15 font-semibold text-turf hover:bg-turf/25"
          : "border-line bg-night-850 text-chalk-muted hover:text-chalk",
      )}
      title={
        ready > 0
          ? `${ready} booster${ready > 1 ? "s" : ""} gratuit${ready > 1 ? "s" : ""} en réserve (max ${cap})`
          : "Prochain booster gratuit"
      }
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M7 3h10l-1 3 1 3-1 3 1 3-1 3 1 3H7l1-3-1-3 1-3-1-3 1-3z" />
      </svg>
      <span className="tabular-nums">
        {ready > 0 ? (
          <>
            <span className="hidden sm:inline">Gratuit </span>
            {ready}/{cap}
          </>
        ) : now === null || target === null ? (
          "…"
        ) : (
          formatCountdown(Math.max(0, target - now))
        )}
      </span>
    </Link>
  );
}
