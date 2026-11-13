"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { abandonSeason, playSeasonHalf, startSeason } from "@/lib/actions/farm";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { FormMessage } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { ClubView } from "@/lib/data/cards";
import type { Fixture, SeasonState, Tactic } from "@/lib/data/farm";

const TACTICS: { key: Tactic; label: string; beats: string }[] = [
  { key: "pressing", label: "Pressing", beats: "bat la possession" },
  { key: "possession", label: "Possession", beats: "bat la contre-attaque" },
  { key: "contre", label: "Contre-attaque", beats: "bat le pressing" },
];
const TACTIC_LABEL: Record<Tactic, string> = { pressing: "Pressing", possession: "Possession", contre: "Contre-attaque" };

function score(f: Fixture): [number, number] {
  return [(f.goals1 ?? 0) + (f.goals2 ?? 0), (f.oppGoals1 ?? 0) + (f.oppGoals2 ?? 0)];
}

function RewardTrack({ points, rewards, given }: { points: number; rewards: SeasonState["rewards"]; given: number[] }) {
  const max = Math.max(30, ...rewards.map((r) => r.points));
  return (
    <div>
      <div className="relative mt-6 h-2 rounded-full bg-night-700">
        <div className="h-full rounded-full bg-turf" style={{ width: `${Math.min(100, (100 * points) / max)}%` }} />
        {rewards.map((r) => (
          <span
            key={r.points}
            className={clsx(
              "absolute -top-5 -translate-x-1/2 text-[11px] font-semibold tabular-nums",
              given.includes(r.points) ? "text-turf" : "text-chalk-faint",
            )}
            style={{ left: `${(100 * r.points) / max}%` }}
            title={`${r.points} points : ${r.count} pack(s)`}
          >
            {r.points}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-chalk-faint">
        Paliers de points : chaque palier atteint rapporte un pack (le dernier davantage en division supérieure).
      </p>
    </div>
  );
}

export function SeasonBoard({ initial, clubs }: { initial: SeasonState; clubs: Record<number, ClubView> }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [lastPlayed, setLastPlayed] = useState<number | null>(null);

  const run = state.run;
  const active = run?.status === "active" ? run : null;
  const fixture = active ? active.fixtures.find((f) => f.matchday === active.matchday) : undefined;
  const opponent = fixture?.club ? clubs[fixture.club] : null;
  const justPlayed = run && lastPlayed ? run.fixtures.find((f) => f.matchday === lastPlayed) : undefined;
  const remainingToday = state.dailyLimit - state.playedToday;
  const canPlay = fixture && (fixture.status === "half" || remainingToday > 0);

  function act(fn: () => Promise<{ ok: true; state: SeasonState } | { ok: false; message: string }>, matchday?: number) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setState(r.state);
      if (matchday !== undefined) setLastPlayed(matchday);
      router.refresh();
    });
  }

  const nextTier = state.nextTier;

  return (
    <div className="space-y-5">
      {error && <FormMessage>{error}</FormMessage>}

      {!active ? (
        <div className="rounded-xl bg-night-900 p-4">
          {run && (
            <p className="mb-2 text-sm">
              Saison {run.number} {run.status === "finished" ? "terminée" : "abandonnée"} : <strong>{run.points} points</strong> (
              {run.wins} V, {run.draws} N, {run.losses} D).{" "}
              {run.status === "finished" &&
                (nextTier > run.tier
                  ? "Montée en division supérieure !"
                  : nextTier < run.tier
                    ? "Descente d'une division."
                    : "Maintien dans la division.")}
            </p>
          )}
          <Button disabled={pending || !state.team?.complete} onClick={() => act(() => startSeason())}>
            {pending ? "Tirage du calendrier…" : `Lancer la saison ${(run?.number ?? 0) + 1} · division ${nextTier}`}
          </Button>
          {!state.team?.complete && <p className="mt-2 text-sm text-coin">Enregistre d&apos;abord un onze complet.</p>}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="font-display text-xl font-extrabold tracking-wide uppercase">
                Saison {active.number} · Division {active.tier}
              </p>
              <p className="text-sm text-chalk-muted">
                {active.points} pts · {active.wins} V {active.draws} N {active.losses} D · {active.goalsFor}-{active.goalsAgainst}{" "}
                · {Math.max(0, remainingToday)} match{remainingToday > 1 ? "s" : ""} jouable{remainingToday > 1 ? "s" : ""}{" "}
                aujourd&apos;hui
              </p>
            </div>
            <button type="button" className="self-start text-xs text-chalk-faint underline" onClick={() => setConfirm(true)}>
              Abandonner la saison
            </button>
          </div>
          <RewardTrack points={active.points} rewards={state.rewards} given={active.rewardsGiven} />
        </>
      )}

      {justPlayed && justPlayed.status === "played" && (
        <div className="rounded-xl border border-line bg-night-850 p-3 text-center">
          {(() => {
            const [a, b] = score(justPlayed);
            const club = justPlayed.club ? clubs[justPlayed.club] : null;
            return (
              <p
                className={clsx(
                  "font-display text-xl font-extrabold",
                  a > b ? "text-success" : a < b ? "text-danger" : "text-chalk",
                )}
              >
                {a > b ? "Victoire" : a < b ? "Défaite" : "Match nul"} {a}–{b} contre {club?.name ?? "l'adversaire"}
              </p>
            );
          })()}
        </div>
      )}

      {active && fixture && (
        <div className="rounded-xl border border-line bg-night-850 p-4">
          <p className="text-xs text-chalk-faint uppercase">Journée {fixture.matchday}/10</p>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p className="font-display font-extrabold uppercase">Ton équipe</p>
              <p className="text-sm text-chalk-muted">Force {fixture.teamStrength ?? state.team?.strength ?? "–"}</p>
            </div>
            <p className="font-display text-3xl font-extrabold tabular-nums" aria-live="polite">
              {fixture.status === "half" ? `${fixture.goals1}–${fixture.oppGoals1}` : "vs"}
            </p>
            <div className="flex flex-col items-end text-right">
              <p className="flex items-center gap-1.5 font-display font-extrabold uppercase">
                {opponent && <Crest club={opponent} className="h-5 w-5" />}
                {opponent?.name ?? "Adversaire"}
              </p>
              <p className="text-sm text-chalk-muted">Force {fixture.oppStrength}</p>
            </div>
          </div>
          {fixture.status === "half" && (
            <p className="mt-2 text-center text-sm text-chalk-muted">
              Mi-temps. Tu as joué {TACTIC_LABEL[fixture.tactic1!]}, l&apos;adversaire {TACTIC_LABEL[fixture.oppTactic1!]}.
            </p>
          )}
          <p className="mt-4 mb-2 text-sm font-semibold">
            {fixture.status === "half" ? "Tactique de seconde mi-temps :" : "Tactique de première mi-temps :"}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {TACTICS.map((t) => (
              <button
                key={t.key}
                type="button"
                disabled={pending || !canPlay}
                onClick={() => act(() => playSeasonHalf(t.key), fixture.status === "half" ? fixture.matchday : undefined)}
                className="rounded-lg border border-line-strong bg-night-900 px-3 py-2 text-left transition-colors duration-150 enabled:hover:border-turf enabled:hover:bg-turf/10 disabled:opacity-50"
              >
                <span className="block font-semibold">{t.label}</span>
                <span className="block text-xs text-chalk-faint">{t.beats}</span>
              </button>
            ))}
          </div>
          {!canPlay && <p className="mt-2 text-sm text-coin">Tes joueurs récupèrent : prochain match demain.</p>}
          <p className="mt-2 text-xs text-chalk-faint">L&apos;adversaire s&apos;adapte à tes habitudes : varie tes tactiques.</p>
        </div>
      )}

      {run && run.fixtures.length > 0 && (
        <ol className="divide-y divide-line rounded-xl border border-line text-sm">
          {run.fixtures.map((f) => {
            const club = f.club ? clubs[f.club] : null;
            const [a, b] = score(f);
            return (
              <li
                key={f.matchday}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2",
                  run.status === "active" && f.matchday === run.matchday && "bg-turf/10",
                )}
              >
                <span className="w-6 text-chalk-faint tabular-nums">J{f.matchday}</span>
                {club && <Crest club={club} className="h-4 w-4" />}
                <span className="min-w-0 flex-1 truncate">{club?.name ?? "?"}</span>
                <span className="text-xs text-chalk-faint tabular-nums">{f.oppStrength}</span>
                <span
                  className={clsx(
                    "w-14 text-right font-semibold tabular-nums",
                    f.status === "played" && (a > b ? "text-success" : a < b ? "text-danger" : "text-chalk-muted"),
                  )}
                >
                  {f.status === "played" ? `${a}–${b}` : f.status === "half" ? "mi-temps" : "–"}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Abandonner la saison ?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Continuer
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                setConfirm(false);
                act(() => abandonSeason());
              }}
            >
              Abandonner
            </Button>
          </>
        }
      >
        <p>Les paliers déjà gagnés restent acquis. Une saison abandonnée ne fait pas changer de division.</p>
      </Modal>
    </div>
  );
}
