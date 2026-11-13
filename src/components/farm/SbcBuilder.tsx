"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { submitSbc, type FarmResult } from "@/lib/actions/farm";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RarityBadge } from "@/components/ui/RarityBadge";
import type { Rarity } from "@/lib/rarity";
import { rarityRank } from "@/lib/rarity";
import { sbcChecks, sbcEligible, type SbcRequirements } from "@/lib/sbc";

export type SbcPick = {
  instanceId: string;
  playerName: string;
  edition: string;
  rating: number;
  rarity: Rarity;
  nation: string;
  nationName: string;
  club: string | null;
  clubName: string | null;
  league: string | null;
  copies: number;
  isLocked: boolean;
};

export function SbcBuilder({
  challengeId,
  requirements,
  available,
  cards,
  names,
}: {
  challengeId: number;
  requirements: SbcRequirements;
  available: boolean;
  cards: SbcPick[];
  names: { leagues: Record<string, string>; nations: Record<string, string> };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [onlyEligible, setOnlyEligible] = useState(true);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<FarmResult | null>(null);
  const [pending, start] = useTransition();

  const byId = useMemo(() => new Map(cards.map((c) => [c.instanceId, c])), [cards]);
  const chosen = selected.map((id) => byId.get(id)!).filter(Boolean);
  const checks = sbcChecks(
    requirements,
    chosen.map((c) => ({ rating: c.rating, rarity: c.rarity, nation: c.nation, club: c.club, league: c.league })),
    names,
  );
  const ready = checks.every((c) => c.ok) && chosen.length > 0;
  const max = requirements.count ?? 30;

  // Doublons d'abord, puis de la plus faible à la plus forte (on sacrifie le moins précieux)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      .filter((c) => !c.isLocked)
      .filter(
        (c) =>
          !onlyEligible ||
          sbcEligible(requirements, { rating: c.rating, rarity: c.rarity, nation: c.nation, club: c.club, league: c.league }),
      )
      .filter((c) => !onlyDuplicates || c.copies > 1)
      .filter((c) => !q || c.playerName.toLowerCase().includes(q) || (c.clubName ?? "").toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(b.copies > 1) - Number(a.copies > 1) || rarityRank(a.rarity) - rarityRank(b.rarity) || a.rating - b.rating,
      );
  }, [cards, onlyEligible, onlyDuplicates, query, requirements]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= max ? prev : [...prev, id]));

  const lastCopies = chosen.filter(
    (c) => c.copies - chosen.filter((x) => x.playerName === c.playerName && x.edition === c.edition).length < 1,
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Joueur, club…"
            aria-label="Filtrer les cartes"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} /> Éligibles
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={onlyDuplicates} onChange={(e) => setOnlyDuplicates(e.target.checked)} /> Doublons
          </label>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-chalk-muted">Aucune carte ne correspond. Ouvre des boosters ou retire un filtre.</p>
        ) : (
          <ul className="max-h-[520px] divide-y divide-line overflow-auto rounded-xl border border-line">
            {visible.map((c) => {
              const on = selected.includes(c.instanceId);
              return (
                <li key={c.instanceId}>
                  <label
                    className={clsx("flex cursor-pointer items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3", on && "bg-turf/10")}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(c.instanceId)}
                      disabled={!on && selected.length >= max}
                    />
                    <span className="w-7 text-center font-display font-extrabold tabular-nums">{c.rating}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.playerName}</span>
                      <span className="block truncate text-xs text-chalk-faint">
                        {c.clubName ?? "Sans club"} · {c.nationName}
                      </span>
                    </span>
                    <RarityBadge rarity={c.rarity} />
                    {c.copies > 1 ? (
                      <span className="w-14 text-right text-xs text-turf">×{c.copies}</span>
                    ) : (
                      <span className="w-14 text-right text-xs text-coin">unique</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <ul className="space-y-1.5 rounded-xl bg-night-900 p-3 text-sm">
          {checks.map((c) => (
            <li key={c.label} className={clsx("flex items-center gap-2", c.ok ? "text-success" : "text-chalk-muted")}>
              <span aria-hidden="true">{c.ok ? "✓" : "○"}</span>
              {c.label}
            </li>
          ))}
        </ul>
        {result && <FormMessage tone={result.ok ? "success" : "error"}>{result.message}</FormMessage>}
        <Button className="w-full" disabled={!available || !ready || pending} onClick={() => setConfirm(true)}>
          {available ? "Valider le défi" : "Défi indisponible pour le moment"}
        </Button>
        {selected.length > 0 && (
          <button type="button" className="w-full text-xs text-chalk-faint underline" onClick={() => setSelected([])}>
            Vider la sélection
          </button>
        )}
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Valider le défi ?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await submitSbc(challengeId, selected);
                  setResult(r);
                  setConfirm(false);
                  if (r.ok) setSelected([]);
                  router.refresh();
                })
              }
            >
              {pending ? "Envoi…" : "Envoyer les cartes"}
            </Button>
          </>
        }
      >
        <p>
          Les {selected.length} cartes sélectionnées seront <strong>définitivement détruites</strong>.
        </p>
        {lastCopies.length > 0 && (
          <p className="mt-2 text-sm text-coin">
            Attention : tu n&apos;auras plus aucun exemplaire de {lastCopies.map((c) => c.playerName).join(", ")}.
          </p>
        )}
      </Modal>
    </div>
  );
}
