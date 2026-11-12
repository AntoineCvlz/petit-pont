"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { proposeTrade } from "@/lib/actions/trades";
import { normalizeText } from "@/lib/collection";
import type { TradableCopy } from "@/lib/data/trades";
import { formatCoins } from "@/lib/format";
import { compareRarityDesc } from "@/lib/rarity";
import { TRADE_MAX_ITEMS, tradeDraftError } from "@/lib/trades";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Pane = {
  title: string;
  copies: TradableCopy[];
  /** Modèles à mettre en avant (« souhaitée par… », « tu ne l'as pas »). */
  highlight: Set<number>;
  highlightLabel: string;
};

function SelectablePane({
  pane,
  selected,
  onToggle,
  total,
}: {
  pane: Pane;
  selected: Set<string>;
  onToggle: (id: string) => void;
  total: number;
}) {
  const [q, setQ] = useState("");
  const [onlyHighlighted, setOnlyHighlighted] = useState(false);
  const visible = useMemo(() => {
    const n = normalizeText(q.trim());
    return pane.copies
      .filter((c) => !n || normalizeText(`${c.template.playerName} ${c.template.club?.name ?? ""}`).includes(n))
      .filter((c) => !onlyHighlighted || pane.highlight.has(c.template.id))
      .sort(
        (a, b) =>
          Number(selected.has(b.instanceId)) - Number(selected.has(a.instanceId)) ||
          Number(pane.highlight.has(b.template.id)) - Number(pane.highlight.has(a.template.id)) ||
          compareRarityDesc(a.template.rarity, b.template.rarity) ||
          b.template.rating - a.template.rating,
      );
  }, [pane, q, onlyHighlighted, selected]);

  return (
    <section className="min-w-0 flex-1 rounded-xl border border-line bg-night-850 p-3" aria-label={pane.title}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold tracking-wider text-chalk-muted uppercase">
          {pane.title} <span className="text-chalk">({selected.size}/{TRADE_MAX_ITEMS})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrer…"
            aria-label={`Filtrer : ${pane.title}`}
            className="h-8 w-36 rounded-lg border border-line-strong bg-night-900 px-2.5 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none"
          />
          {pane.highlight.size > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-chalk-muted">
              <input type="checkbox" className="accent-turf" checked={onlyHighlighted} onChange={(e) => setOnlyHighlighted(e.target.checked)} />
              {pane.highlightLabel}
            </label>
          )}
        </div>
      </header>
      {pane.copies.length === 0 ? (
        <p className="py-6 text-center text-sm text-chalk-muted">Aucune carte disponible à l&apos;échange.</p>
      ) : (
        <ul className="grid max-h-[560px] grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-x-2 gap-y-4 overflow-y-auto pt-2 pr-1">
          {visible.map((c) => {
            const isSel = selected.has(c.instanceId);
            const disabled = !isSel && selected.size >= TRADE_MAX_ITEMS;
            return (
              <li key={c.instanceId} className="relative">
                <button
                  type="button"
                  onClick={() => onToggle(c.instanceId)}
                  disabled={disabled}
                  aria-pressed={isSel}
                  className={clsx(
                    "block rounded-[var(--radius-card)] transition-[outline,opacity] duration-150",
                    isSel ? "outline-3 outline-offset-2 outline-turf" : "opacity-90 hover:opacity-100",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <Card template={c.template} collectionTotal={total} serialNumber={c.serialNumber} size="sm" interactive={false} />
                </button>
                {pane.highlight.has(c.template.id) && (
                  <span className="pointer-events-none absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 rounded bg-r-iconique px-1.5 text-[10px] font-bold whitespace-nowrap text-night-950 uppercase">
                    {pane.highlightLabel}
                  </span>
                )}
                {isSel && (
                  <span className="pointer-events-none absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-turf text-sm font-bold text-turf-ink">
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TradeComposer({
  partner,
  myCopies,
  theirCopies,
  partnerWishlist,
  myMissing,
  myCoins,
  total,
  parentTradeId,
  initial,
}: {
  partner: { id: string; username: string };
  myCopies: TradableCopy[];
  theirCopies: TradableCopy[];
  partnerWishlist: number[];
  myMissing: number[];
  myCoins: number;
  total: number;
  parentTradeId: string | null;
  initial?: { offered: string[]; requested: string[]; giveCoins: number; askCoins: number };
}) {
  const router = useRouter();
  const [offered, setOffered] = useState<Set<string>>(new Set(initial?.offered ?? []));
  const [requested, setRequested] = useState<Set<string>>(new Set(initial?.requested ?? []));
  const [giveCoins, setGiveCoins] = useState(String(initial?.giveCoins ?? 0));
  const [askCoins, setAskCoins] = useState(String(initial?.askCoins ?? 0));
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else if (next.size < TRADE_MAX_ITEMS) next.add(id);
    setter(next);
  };

  const draft = {
    offered: [...offered],
    requested: [...requested],
    giveCoins: Number(giveCoins || 0),
    askCoins: Number(askCoins || 0),
    message: message.trim(),
  };
  const draftError = tradeDraftError(draft, myCoins);

  function submit() {
    if (draftError) {
      setError(draftError);
      return;
    }
    start(async () => {
      const r = await proposeTrade(partner.id, draft, parentTradeId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      router.push("/echanges?onglet=envoyes");
    });
  }

  const coinInput = "h-9 w-32 rounded-lg border border-line-strong bg-night-900 px-3 text-sm tabular-nums focus:border-turf focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row">
        <SelectablePane
          pane={{
            title: "Tu donnes",
            copies: myCopies,
            highlight: new Set(partnerWishlist),
            highlightLabel: `Souhaitée par ${partner.username}`,
          }}
          selected={offered}
          onToggle={toggle(offered, setOffered)}
          total={total}
        />
        <SelectablePane
          pane={{ title: `Tu demandes à ${partner.username}`, copies: theirCopies, highlight: new Set(myMissing), highlightLabel: "Pas dans ta collection" }}
          selected={requested}
          onToggle={toggle(requested, setRequested)}
          total={total}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-night-850 p-4 md:flex-row md:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">Pièces que tu donnes</span>
          <input type="number" min={0} step={1} inputMode="numeric" value={giveCoins} onChange={(e) => setGiveCoins(e.target.value)} className={coinInput} />
          <span className="mt-0.5 block text-xs text-chalk-faint">Solde : {formatCoins(myCoins)}</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">Pièces demandées</span>
          <input type="number" min={0} step={1} inputMode="numeric" value={askCoins} onChange={(e) => setAskCoins(e.target.value)} className={coinInput} />
          <span className="mt-0.5 block text-xs text-chalk-faint">&nbsp;</span>
        </label>
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">Message (facultatif)</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={280}
            placeholder="Un petit mot pour convaincre…"
            className="h-9 w-full rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none"
          />
          <span className="mt-0.5 block text-xs text-chalk-faint">{message.length}/280</span>
        </label>
        <div className="space-y-1">
          <Button onClick={submit} disabled={pending || draftError !== null} className="w-full md:w-auto">
            {pending ? "Envoi…" : parentTradeId ? "Envoyer la contre-proposition" : "Proposer l'échange"}
          </Button>
          <p className="text-xs text-chalk-faint">
            {offered.size} carte{offered.size > 1 ? "s" : ""} ⇄ {requested.size} carte{requested.size > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      {(error || draftError) && (
        <p role="alert" className={error ? "text-sm text-danger" : "text-sm text-chalk-muted"}>
          {error ?? draftError}
        </p>
      )}
    </div>
  );
}
