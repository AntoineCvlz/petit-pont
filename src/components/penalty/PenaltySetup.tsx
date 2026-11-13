"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { startPenalty } from "@/lib/actions/penalty";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { RarityBadge } from "@/components/ui/RarityBadge";
import type { CardTemplateView } from "@/lib/data/cards";

export type SetupCard = { instanceId: string; template: CardTemplateView };

/**
 * Meilleure composition (cartes triées par note) : les 5 meilleurs joueurs de champ (footballeurs distincts),
 * puis le meilleur gardien ; sans gardien, le meilleur joueur restant garde les buts (malus affiché).
 */
function autoPick(cards: SetupCard[]): { keeper: string | null; shooters: string[] } {
  const shooters: string[] = [];
  const players = new Set<string>();
  for (const c of cards) {
    if (c.template.position === "GB" || players.has(c.template.playerSlug)) continue;
    players.add(c.template.playerSlug);
    shooters.push(c.instanceId);
    if (shooters.length === 5) break;
  }
  const keeper = cards.find((c) => c.template.position === "GB") ?? cards.find((c) => !shooters.includes(c.instanceId)) ?? null;
  return { keeper: keeper?.instanceId ?? null, shooters };
}

export function PenaltySetup({ cards, remaining }: { cards: SetupCard[]; remaining: number }) {
  const router = useRouter();
  const initial = useMemo(() => autoPick(cards), [cards]);
  const [keeper, setKeeper] = useState<string | null>(initial.keeper);
  const [shooters, setShooters] = useState<string[]>(initial.shooters);
  const [filter, setFilter] = useState<"tous" | "GB">("tous");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byId = useMemo(() => new Map(cards.map((c) => [c.instanceId, c])), [cards]);

  const keeperCard = keeper ? byId.get(keeper) : undefined;
  const slugs = new Set(shooters.map((id) => byId.get(id)?.template.playerSlug));

  function toggleShooter(c: SetupCard) {
    setError(null);
    setShooters((prev) => {
      if (prev.includes(c.instanceId)) return prev.filter((id) => id !== c.instanceId);
      if (prev.length >= 5) return prev;
      return [...prev, c.instanceId];
    });
  }

  const visible = filter === "GB" ? cards.filter((c) => c.template.position === "GB") : cards;
  const ready = keeper !== null && shooters.length === 5;

  if (cards.length < 6) {
    return (
      <p className="text-sm text-chalk-muted">
        Il te faut au moins 6 cartes (5 tireurs et un gardien). Ouvre quelques boosters !
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-night-900 p-3">
          <p className="mb-1 text-xs text-chalk-faint uppercase">Gardien</p>
          {keeperCard ? (
            <p className="font-semibold">
              {keeperCard.template.playerName} <span className="text-chalk-muted">({keeperCard.template.rating})</span>
              {keeperCard.template.position !== "GB" && (
                <span className="ml-1 text-xs text-coin">joueur de champ : −20 au but</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-chalk-muted">Choisis ton gardien (bouton « Gardien »).</p>
          )}
        </div>
        <div className="rounded-xl bg-night-900 p-3">
          <p className="mb-1 text-xs text-chalk-faint uppercase">Tireurs ({shooters.length}/5, dans l&apos;ordre)</p>
          <ol className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
            {shooters.map((id, i) => {
              const c = byId.get(id)!;
              return (
                <li key={id}>
                  <span className="text-chalk-faint">{i + 1}.</span> {c.template.playerName}{" "}
                  <span className="text-chalk-muted">({c.template.rating})</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setKeeper(initial.keeper);
            setShooters(initial.shooters);
          }}
        >
          Composition automatique
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShooters([])}>
          Vider les tireurs
        </Button>
        <span className="ml-auto flex gap-1 text-sm">
          {(["tous", "GB"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-lg px-3 py-1",
                filter === f ? "bg-night-600 font-semibold" : "text-chalk-muted hover:bg-night-800",
              )}
            >
              {f === "tous" ? "Toutes" : "Gardiens"}
            </button>
          ))}
        </span>
      </div>

      <ul className="max-h-[420px] divide-y divide-line overflow-auto rounded-xl border border-line">
        {visible.map((c) => {
          const order = shooters.indexOf(c.instanceId);
          const isKeeper = keeper === c.instanceId;
          const duplicatePlayer = order === -1 && slugs.has(c.template.playerSlug);
          return (
            <li
              key={c.instanceId}
              className={clsx("flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3", (order !== -1 || isKeeper) && "bg-turf/10")}
            >
              <span className="w-8 text-center font-display text-lg font-extrabold tabular-nums">{c.template.rating}</span>
              <span className="hidden w-9 text-xs text-chalk-muted sm:inline">{c.template.position}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{c.template.playerName}</span>
                <span className="ml-2 hidden sm:inline">
                  <RarityBadge rarity={c.template.rarity} />
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setKeeper(isKeeper ? null : c.instanceId);
                  setShooters((prev) => prev.filter((id) => id !== c.instanceId));
                }}
                className={clsx(
                  "rounded-md px-2 py-1 text-xs",
                  isKeeper ? "bg-coin/20 font-semibold text-coin" : "text-chalk-muted hover:bg-night-800",
                )}
                aria-pressed={isKeeper}
              >
                Gardien
              </button>
              <button
                type="button"
                onClick={() => toggleShooter(c)}
                disabled={isKeeper || duplicatePlayer || (order === -1 && shooters.length >= 5)}
                className={clsx(
                  "min-w-16 rounded-md px-1.5 py-1 text-xs disabled:opacity-40 sm:min-w-20 sm:px-2",
                  order !== -1 ? "bg-turf/20 font-semibold text-turf" : "text-chalk-muted enabled:hover:bg-night-800",
                )}
                aria-pressed={order !== -1}
              >
                {order !== -1 ? `Tireur ${order + 1}` : "Tireur"}
              </button>
            </li>
          );
        })}
      </ul>

      {error && <FormMessage>{error}</FormMessage>}
      <Button
        className="w-full sm:w-auto"
        disabled={!ready || pending || remaining === 0}
        onClick={() =>
          start(async () => {
            const r = await startPenalty(shooters, keeper!);
            if (!r.ok) setError(r.message);
            router.refresh();
          })
        }
      >
        {remaining === 0 ? "Plus de tournoi aujourd'hui" : pending ? "Tirage au sort…" : "Lancer le tournoi"}
      </Button>
    </div>
  );
}
