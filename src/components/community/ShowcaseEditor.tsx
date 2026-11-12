"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { setShowcase } from "@/lib/actions/community";
import { normalizeText } from "@/lib/collection";
import type { TradableCopy } from "@/lib/data/trades";
import { compareRarityDesc } from "@/lib/rarity";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Choix des 5 cartes vitrines du profil (exemplaires libres). */
export function ShowcaseEditor({ copies, initial, total }: { copies: TradableCopy[]; initial: string[]; total: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initial);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const visible = useMemo(() => {
    const n = normalizeText(q.trim());
    return copies
      .filter((c) => !n || normalizeText(c.template.playerName).includes(n))
      .sort((a, b) => compareRarityDesc(a.template.rarity, b.template.rarity) || b.template.rating - a.template.rating)
      .slice(0, 60);
  }, [copies, q]);

  function toggle(id: string) {
    setMessage(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 5 ? [...s, id] : s));
  }

  const byId = new Map(copies.map((c) => [c.instanceId, c]));

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2" aria-label="Vitrine (dans l'ordre)">
        {Array.from({ length: 5 }, (_, i) => {
          const c = byId.get(selected[i] ?? "");
          return (
            <li key={i}>
              {c ? (
                <button type="button" onClick={() => toggle(c.instanceId)} aria-label={`Retirer ${c.template.playerName} de la vitrine`} className="block rounded-[var(--radius-card)]">
                  <Card template={c.template} collectionTotal={total} serialNumber={c.serialNumber} size="sm" interactive={false} />
                </button>
              ) : (
                <div className="flex aspect-[5/7.4] w-[132px] items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-line-strong text-sm text-chalk-faint">
                  {i + 1}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setShowcase(selected);
              setMessage({ ok: r.ok, text: r.message ?? "" });
              router.refresh();
            })
          }
        >
          {pending ? "Enregistrement…" : "Enregistrer la vitrine"}
        </Button>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher une carte…"
          aria-label="Chercher une carte pour la vitrine"
          className="h-8 w-48 rounded-lg border border-line-strong bg-night-900 px-2.5 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none"
        />
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-success" : "text-sm text-danger"}>
            {message.text}
          </p>
        )}
      </div>
      <ul className="flex max-h-[440px] flex-wrap gap-2 overflow-y-auto">
        {visible.map((c) => {
          const isSel = selected.includes(c.instanceId);
          return (
            <li key={c.instanceId}>
              <button
                type="button"
                onClick={() => toggle(c.instanceId)}
                aria-pressed={isSel}
                disabled={!isSel && selected.length >= 5}
                className={clsx(
                  "block rounded-[var(--radius-card)] disabled:opacity-40",
                  isSel && "outline-3 outline-offset-2 outline-turf",
                )}
              >
                <Card template={c.template} collectionTotal={total} serialNumber={c.serialNumber} size="sm" interactive={false} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
