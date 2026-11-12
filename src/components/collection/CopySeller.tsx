"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sellDuplicates } from "@/lib/actions/boosters";
import { formatCoins } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { CoinIcon } from "@/components/ui/CoinAmount";

export type SellableCopy = { id: string; label: string; isLocked: boolean };

/**
 * Sélection d'exemplaires à revendre depuis la fiche d'une carte.
 * Au moins un exemplaire doit rester (règle revérifiée par la RPC).
 */
export function CopySeller({ copies, unitPrice }: { copies: SellableCopy[]; unitPrice: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const sellable = copies.filter((c) => !c.isLocked);
  const maxSelectable = copies.length - 1; // il faut en garder un
  if (copies.length < 2 || sellable.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxSelectable) next.add(id);
      return next;
    });
  }

  function sell() {
    start(async () => {
      const r = await sellDuplicates([...selected]);
      if (r.ok) {
        setMessage({ ok: true, text: `Revendu pour ${formatCoins(r.coins)} pièces.` });
        setSelected(new Set());
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.message });
      }
    });
  }

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-xs text-chalk-muted">
          Choisis les exemplaires à revendre ({formatCoins(unitPrice)} pièces chacun, {maxSelectable} au maximum).
        </legend>
        <div className="flex flex-wrap gap-2">
          {copies.map((c) => (
            <label
              key={c.id}
              className={
                c.isLocked
                  ? "flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm text-chalk-faint"
                  : "flex cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-2.5 py-1.5 text-sm hover:bg-night-800"
              }
            >
              <input
                type="checkbox"
                className="accent-turf"
                checked={selected.has(c.id)}
                disabled={c.isLocked || (!selected.has(c.id) && selected.size >= maxSelectable)}
                onChange={() => toggle(c.id)}
              />
              <span className="tabular-nums">{c.label}</span>
              {c.isLocked && <span className="text-xs">(engagé)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={sell} disabled={pending || selected.size === 0}>
          {pending ? (
            "Revente…"
          ) : (
            <>
              Revendre {selected.size || ""} pour <CoinIcon className="h-3.5 w-3.5" /> {formatCoins(selected.size * unitPrice)}
            </>
          )}
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-success" : "text-sm text-danger"}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
