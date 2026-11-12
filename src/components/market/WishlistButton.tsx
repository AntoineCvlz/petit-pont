"use client";

import { useOptimistic, useTransition } from "react";
import { clsx } from "clsx";
import { toggleWishlist } from "@/lib/actions/market";

export function WishlistButton({ templateId, initial }: { templateId: number; initial: boolean }) {
  const [wanted, setWanted] = useOptimistic(initial);
  const [, start] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={wanted}
      onClick={() =>
        start(async () => {
          setWanted(!wanted);
          await toggleWishlist(templateId, !wanted);
        })
      }
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors duration-150",
        wanted ? "border-r-iconique/50 bg-r-iconique/10 text-r-iconique" : "border-line-strong text-chalk-muted hover:text-chalk",
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={wanted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
      {wanted ? "Dans ma liste de souhaits" : "Ajouter à ma liste de souhaits"}
    </button>
  );
}
