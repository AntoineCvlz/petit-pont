"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { abandonPenalty, kickPenalty, type LastKick } from "@/lib/actions/penalty";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { FormMessage } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { CardTemplateView, ClubView } from "@/lib/data/cards";
import type { PenaltyRewards, PenaltyState } from "@/lib/data/penalty";
import {
  DIRECTION_LABELS,
  DIRECTIONS,
  kickMessage,
  kickSlots,
  nextShooterIndex,
  nextSide,
  ROUND_LABELS,
  ROUND_SHORT,
  type Direction,
  type Kick,
  type KickResult,
} from "@/lib/penalty";

const ZONE_X: Record<Direction, number> = { gauche: 22, centre: 50, droite: 78 };

function Dots({ slots, label }: { slots: (KickResult | null)[]; label: string }) {
  return (
    <ol className="flex gap-1" aria-label={label}>
      {slots.map((r, i) => (
        <li
          key={i}
          className={clsx(
            "h-3.5 w-3.5 rounded-full border",
            r === "goal" && "border-success bg-success",
            (r === "saved" || r === "missed") && "border-danger bg-danger/80",
            r === null && "border-white/30",
          )}
          title={r === "goal" ? "But" : r === "saved" ? "Arrêté" : r === "missed" ? "Raté" : "À tirer"}
        />
      ))}
    </ol>
  );
}

/** But vu de face : zones cliquables, ballon et gardien animés (≤ 300 ms). */
function Goal({
  mode,
  last,
  disabled,
  onChoose,
}: {
  mode: "shoot" | "save";
  last: LastKick | null;
  disabled: boolean;
  onChoose: (d: Direction) => void;
}) {
  const ball = last
    ? last.result === "missed"
      ? { x: ZONE_X[last.direction] + (last.direction === "droite" ? 18 : -18), y: 4 }
      : { x: ZONE_X[last.direction], y: 38 }
    : { x: 50, y: 92 };
  const keeperX = last ? ZONE_X[last.dive] : 50;
  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-[560px] select-none">
      <svg viewBox="0 0 100 56" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect x="0" y="0" width="100" height="56" fill="#1a5230" />
        <rect x="0" y="40" width="100" height="16" fill="#1d5a35" />
        {/* Filet */}
        <g stroke="rgba(255,255,255,0.12)" strokeWidth="0.3">
          {Array.from({ length: 19 }, (_, i) => (
            <line key={`v${i}`} x1={8 + i * 4.67} y1="8" x2={8 + i * 4.67} y2="40" />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1="8" y1={8 + i * 4.6} x2="92" y2={8 + i * 4.6} />
          ))}
        </g>
        {/* Cadre */}
        <path d="M8 40V8h84v32" fill="none" stroke="#f4f7f5" strokeWidth="1.6" />
        <ellipse cx="50" cy="50" rx="1.6" ry="0.7" fill="rgba(255,255,255,0.6)" />
      </svg>
      {/* Gardien */}
      <svg
        viewBox="0 0 40 50"
        className="absolute bottom-[28%] h-[50%] w-[14%] origin-bottom transition-[left,transform] duration-300 ease-out"
        style={{
          left: `${keeperX}%`,
          transform: `translateX(-50%) rotate(${last ? (last.dive === "gauche" ? -62 : last.dive === "droite" ? 62 : 0) : 0}deg)`,
        }}
        aria-hidden="true"
      >
        {/* Bras levés, gants, tête, maillot, jambes */}
        <path d="M9 22 3 6M31 22l6-16" stroke="#f5a524" strokeWidth="5" strokeLinecap="round" />
        <circle cx="3" cy="5" r="3.2" fill="#f4f7f5" />
        <circle cx="37" cy="5" r="3.2" fill="#f4f7f5" />
        <circle cx="20" cy="9" r="5.5" fill="#e9c9a6" />
        <rect x="11" y="15" width="18" height="19" rx="5" fill="#f5a524" />
        <path d="M15 33v15M25 33v15" stroke="#1f2937" strokeWidth="5" strokeLinecap="round" />
      </svg>
      {/* Ballon */}
      <div
        className="absolute h-[9%] w-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-night-950/40 bg-white shadow transition-[left,top] duration-300 ease-out"
        style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
        aria-hidden="true"
      />
      {/* Zones */}
      <div className="absolute inset-x-[8%] top-[14%] bottom-[28%] grid grid-cols-3">
        {DIRECTIONS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(d)}
            className="m-0.5 rounded-md border border-transparent text-sm font-semibold text-transparent transition-colors duration-150 enabled:hover:border-white/60 enabled:hover:bg-white/10 enabled:hover:text-white focus-visible:border-white focus-visible:text-white focus-visible:outline-none"
            aria-label={`${mode === "shoot" ? "Tirer" : "Plonger"} ${d === "centre" ? "au centre" : `à ${d}`}`}
          >
            {DIRECTION_LABELS[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PenaltyGame({
  initial,
  cards,
  opponent,
  rewards,
}: {
  initial: PenaltyState;
  cards: Record<number, CardTemplateView>;
  opponent: ClubView | null;
  rewards: PenaltyRewards;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [last, setLast] = useState<LastKick | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  // Le match affiché reste celui de ces props jusqu'au rafraîchissement (« Match suivant » : nouvel adversaire).
  // Après le tir décisif, la base renvoie déjà le match suivant : on garde donc ici les tirs du match en cours.
  const match = initial.match!;
  const [shownKicks, setShownKicks] = useState<Kick[]>(match.kicks);
  const playerScore = last?.matchRound === match.round ? last.playerScore : match.playerScore;
  const oppScore = last?.matchRound === match.round ? last.oppScore : match.oppScore;
  const matchOver = last?.matchOver ?? false;
  const tournamentOver = state.status !== "playing";
  const side = nextSide(shownKicks);
  const shooter =
    side === "player"
      ? cards[initial.shooters[nextShooterIndex(shownKicks, "player")]!]
      : cards[match.oppShooters[nextShooterIndex(shownKicks, "opponent")]!];
  const keeper = side === "player" ? cards[match.oppKeeper] : cards[initial.keeper];
  const lastShooter = last ? cards[last.shooter] : null;

  function choose(d: Direction) {
    if (pending || matchOver) return;
    setError(null);
    start(async () => {
      const r = await kickPenalty(state.id, d);
      if (!r.ok) {
        setError(r.message);
        router.refresh();
        return;
      }
      const k = r.lastKick!;
      setLast(k);
      setState(r.state);
      setShownKicks((prev) => [
        ...prev,
        { n: prev.length, side: k.side, shooter: k.shooter, direction: k.direction, dive: k.dive, result: k.result },
      ]);
    });
  }

  const finalMessage =
    state.status === "won"
      ? `Champion ! Tu remportes le tournoi : +${rewards.victoire} pièces.`
      : `Éliminé en ${ROUND_LABELS[state.round]!.toLowerCase()}.${state.reward > 0 ? ` +${state.reward} pièces.` : ""}`;

  return (
    <div className="space-y-4">
      {/* Tableau */}
      <ol className="flex items-center justify-center gap-2 text-xs font-semibold uppercase" aria-label="Tableau du tournoi">
        {[1, 2, 3].map((r) => (
          <li
            key={r}
            className={clsx(
              "rounded-full px-3 py-1",
              r < match.round || (r === match.round && last?.winner === "player")
                ? "bg-success/20 text-success"
                : r === match.round
                  ? "bg-turf text-night-950"
                  : "bg-night-800 text-chalk-faint",
            )}
            aria-current={r === match.round ? "step" : undefined}
          >
            {ROUND_SHORT[r]}
          </li>
        ))}
      </ol>

      {/* Score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-night-900 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-display font-extrabold tracking-wide uppercase">Toi</p>
          <Dots slots={kickSlots(shownKicks, "player")} label="Tes tirs" />
        </div>
        <p className="font-display text-3xl font-extrabold tabular-nums" aria-live="polite">
          {playerScore} – {oppScore}
        </p>
        <div className="flex min-w-0 flex-col items-end">
          <p className="flex items-center gap-1.5 truncate font-display font-extrabold tracking-wide uppercase">
            {opponent && <Crest club={opponent} className="h-5 w-5" />}
            {opponent?.name ?? "Adversaire"}
          </p>
          <Dots slots={kickSlots(shownKicks, "opponent")} label="Tirs adverses" />
        </div>
      </div>

      <Goal
        mode={side === "player" ? "shoot" : "save"}
        last={last?.matchRound === match.round ? last : null}
        disabled={pending || matchOver}
        onChoose={choose}
      />

      {/* Résultat du dernier tir */}
      <div className="min-h-14 text-center" aria-live="polite">
        {last && last.matchRound === match.round && (
          <p
            className={clsx(
              "font-display text-2xl font-extrabold uppercase italic",
              (last.side === "player") === (last.result === "goal") ? "text-success" : "text-danger",
            )}
          >
            {kickMessage(last)}
            {lastShooter && (
              <span className="ml-2 align-middle text-sm font-normal text-chalk-muted not-italic normal-case">
                {lastShooter.playerName}
              </span>
            )}
          </p>
        )}
        {error && <FormMessage>{error}</FormMessage>}
      </div>

      {matchOver ? (
        <div className="rounded-xl border border-line bg-night-850 p-4 text-center">
          {tournamentOver ? (
            <>
              <p className="font-display text-xl font-extrabold">{finalMessage}</p>
              <Button className="mt-3" onClick={() => start(() => router.refresh())} disabled={pending}>
                {pending ? "Chargement…" : "Terminer"}
              </Button>
            </>
          ) : (
            <>
              <p className="font-display text-xl font-extrabold text-success">
                Qualifié ! Place à la {ROUND_LABELS[state.round]!.toLowerCase()}.
              </p>
              <Button className="mt-3" onClick={() => start(() => router.refresh())} disabled={pending}>
                {pending ? "Chargement…" : "Match suivant"}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>
            {side === "player" ? (
              <>
                <span className="font-semibold text-turf">À toi de tirer</span> avec <strong>{shooter?.playerName}</strong> (
                {shooter?.rating}) face à {keeper?.playerName} : choisis ton côté.
              </>
            ) : (
              <>
                <strong>{shooter?.playerName}</strong> ({shooter?.rating}) s&apos;élance.{" "}
                <span className="font-semibold text-turf">Où plonge {keeper?.playerName} ?</span>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => setConfirmAbandon(true)}
            className="text-xs text-chalk-faint underline hover:text-chalk"
          >
            Abandonner
          </button>
        </div>
      )}

      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Abandonner le tournoi ?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAbandon(false)}>
              Continuer
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await abandonPenalty(state.id);
                  setConfirmAbandon(false);
                  if (!r.ok) setError(r.message);
                  router.refresh();
                })
              }
            >
              Abandonner
            </Button>
          </>
        }
      >
        <p>Le match en cours est perdu. Tu gardes la récompense du tour atteint.</p>
      </Modal>
    </div>
  );
}
