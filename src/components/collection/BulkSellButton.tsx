"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sellAllDuplicates } from "@/lib/actions/economy";
import { previewFromSummary, type DuplicateSummary } from "@/lib/economy";
import { formatCoins } from "@/lib/format";
import { RARITIES, RARITY_LABELS, type Rarity } from "@/lib/rarity";
import { Button } from "@/components/ui/Button";
import { CoinIcon } from "@/components/ui/CoinAmount";
import { Modal } from "@/components/ui/Modal";

/** Revente groupée des doublons, avec plafond de rareté et confirmation. */
export function BulkSellButton({ summary, prices }: { summary: DuplicateSummary; prices: Partial<Record<Rarity, number>> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [maxRarity, setMaxRarity] = useState<Rarity>("rare");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const any = previewFromSummary(summary, "speciale", prices).count > 0;
  const preview = previewFromSummary(summary, maxRarity, prices);

  function confirm() {
    start(async () => {
      const r = await sellAllDuplicates(maxRarity);
      if (r.ok) {
        setMessage({ ok: true, text: `${r.sold} doublon${r.sold > 1 ? "s" : ""} revendu${r.sold > 1 ? "s" : ""} pour ${formatCoins(r.coins)} pièces.` });
        setOpen(false);
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.message });
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => { setMessage(null); setOpen(true); }} disabled={!any}>
          Revendre les doublons
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-success" : "text-sm text-danger"}>
            {message.text}
          </p>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Revendre les doublons"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={confirm} disabled={pending || preview.count === 0}>
              {pending ? (
                "Revente…"
              ) : (
                <>
                  Revendre {preview.count} pour <CoinIcon className="h-3.5 w-3.5" /> {formatCoins(preview.coins)}
                </>
              )}
            </Button>
          </>
        }
      >
        <p>Tu gardes toujours un exemplaire de chaque carte (le plus petit numéro de série). Les cartes en vente ou dans un échange ne sont pas touchées.</p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold tracking-wide uppercase">Jusqu&apos;à la rareté</span>
          <select
            value={maxRarity}
            onChange={(e) => setMaxRarity(e.target.value as Rarity)}
            className="h-9 w-full rounded-lg border border-line-strong bg-night-900 px-2.5 text-sm text-chalk focus:border-turf focus:outline-none"
          >
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABELS[r]}
                {r === "commune" ? " uniquement" : " et en dessous"}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-chalk" aria-live="polite">
          {preview.count === 0 ? "Aucun doublon à revendre avec ce plafond." : `${preview.count} exemplaire${preview.count > 1 ? "s" : ""} · ${formatCoins(preview.coins)} pièces`}
        </p>
        {message && !message.ok && (
          <p role="alert" className="mt-2 text-danger">
            {message.text}
          </p>
        )}
      </Modal>
    </>
  );
}
