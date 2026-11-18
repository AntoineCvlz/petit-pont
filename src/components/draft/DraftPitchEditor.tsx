"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { swapDraft } from "@/lib/actions/draft";
import { FormMessage } from "@/components/ui/Field";
import type { DraftCard } from "@/lib/data/draft";
import type { DraftFormation } from "@/lib/draft";
import { DraftPitch } from "./DraftPitch";

/**
 * Terrain modifiable : un clic sur un joueur le sélectionne, un clic sur un joueur de la même ligne les échange.
 * L'échange est affiché tout de suite (collectif recalculé en direct), puis confirmé par la base.
 */
export function DraftPitchEditor({
  draftId,
  formation,
  picks: initialPicks,
  currentSlot = null,
}: {
  draftId: string;
  formation: DraftFormation;
  picks: Partial<Record<string, DraftCard>>;
  currentSlot?: string | null;
}) {
  const router = useRouter();
  const [picks, setPicks] = useState(initialPicks);
  const [source, setSource] = useState(initialPicks);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Nouveau choix (ou rafraîchissement) : on repart de l'état serveur
  if (source !== initialPicks) {
    setSource(initialPicks);
    setPicks(initialPicks);
  }

  function swap(a: string, b: string) {
    const before = picks;
    setPicks({ ...picks, [a]: picks[b], [b]: picks[a] });
    start(async () => {
      const r = await swapDraft(draftId, a, b);
      if (!r.ok) {
        setPicks(before);
        setError(r.message);
      }
      router.refresh();
    });
  }

  function click(slot: string) {
    if (pending) return;
    setError(null);
    if (selected === null) return setSelected(slot);
    if (selected === slot) return setSelected(null);
    const a = selected;
    setSelected(null);
    swap(a, slot);
  }

  function drop(from: string, to: string) {
    if (pending) return;
    setError(null);
    setSelected(null);
    swap(from, to);
  }

  const filled = Object.keys(picks).length;
  return (
    <div className="space-y-2">
      <DraftPitch
        formation={formation}
        picks={picks}
        currentSlot={currentSlot}
        selected={selected}
        onSlotClick={click}
        onSwap={drop}
      />
      <p className="text-center text-xs text-chalk-faint" aria-live="polite">
        {selected
          ? "Touche un joueur de la même ligne pour les échanger (ou le même pour annuler)."
          : filled >= 2
            ? "Glisse un joueur sur un autre de la même ligne (ou touche-les l'un après l'autre) pour les échanger : le collectif s'adapte."
            : null}
      </p>
      {error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}
