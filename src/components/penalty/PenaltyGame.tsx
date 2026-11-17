"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { abandonPenalty, kickPenalty, type LastKick } from "@/lib/actions/penalty";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { FormMessage } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { KICK_TIMING, PenaltyScene, type ScenePhase } from "./PenaltyScene";
import type { CardTemplateView, ClubView } from "@/lib/data/cards";
import type { PenaltyRewards, PenaltyState } from "@/lib/data/penalty";
import {
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

/** Animations réduites : préférence système ou réglage du profil (attribut posé sur la zone de jeu). */
function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.querySelector('[data-reduced-motion="true"]') !== null
  );
}

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

  // Séquence animée du dernier tir : le score et le message ne changent qu'une fois l'action terminée
  const [anim, setAnim] = useState<{ kick: LastKick; phase: ScenePhase } | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const animating = anim !== null && anim.phase !== "rest";

  function apply(k: LastKick, next: PenaltyState) {
    setLast(k);
    setState(next);
    setShownKicks((prev) => [
      ...prev,
      { n: prev.length, side: k.side, shooter: k.shooter, direction: k.direction, dive: k.dive, result: k.result },
    ]);
  }

  function play(k: LastKick, next: PenaltyState) {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (reducedMotion()) {
      setAnim(null);
      apply(k, next);
      return;
    }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const t1 = 30;
    const t2 = t1 + KICK_TIMING.runup;
    const t3 = t2 + KICK_TIMING.flight;
    const t4 = t3 + (k.result === "saved" ? KICK_TIMING.rebound : 0) + KICK_TIMING.hold;
    setAnim({ kick: k, phase: "idle" });
    at(t1, () => setAnim({ kick: k, phase: "runup" }));
    at(t2, () => setAnim({ kick: k, phase: "flight" }));
    at(t3, () => setAnim({ kick: k, phase: "outcome" }));
    // Fin de l'action : retour au point de penalty avec le tireur et le gardien suivants
    at(t4, () => {
      setAnim(null);
      apply(k, next);
    });
  }

  function choose(d: Direction) {
    if (pending || animating || matchOver) return;
    setError(null);
    start(async () => {
      const r = await kickPenalty(state.id, d);
      if (!r.ok) {
        setError(r.message);
        router.refresh();
        return;
      }
      play(r.lastKick!, r.state);
    });
  }

  const finalMessage =
    state.status === "won"
      ? `Champion ! Tu remportes le tournoi : +${rewards.victoire} pièces.`
      : `Éliminé en ${ROUND_LABELS[state.round]!.toLowerCase()}.${state.reward > 0 ? ` +${state.reward} pièces.` : ""}`;

  return (
    <div className="space-y-4">
      {/* Tableau */}
      <ol
        className="flex items-center justify-center gap-2 text-xs font-semibold uppercase"
        aria-label="Tableau du tournoi"
      >
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

      <PenaltyScene
        mode={side === "player" ? "shoot" : "save"}
        kick={anim && anim.kick.matchRound === match.round ? anim.kick : null}
        phase={anim && anim.kick.matchRound === match.round ? anim.phase : "idle"}
        disabled={pending || animating || matchOver}
        onChoose={choose}
        shooterName={(anim ? cards[anim.kick.shooter] : shooter)?.playerName ?? ""}
        keeperName={
          (anim ? (anim.kick.side === "player" ? cards[match.oppKeeper] : cards[initial.keeper]) : keeper)
            ?.playerName ?? ""
        }
        shooterColor={(anim ? anim.kick.side : side) === "player" ? "#4ade80" : (opponent?.colorPrimary ?? "#ef4444")}
        keeperColor={(anim ? anim.kick.side : side) === "player" ? "#38bdf8" : "#f5a524"}
      />

      {/* Résultat du dernier tir */}
      <div className="min-h-14 text-center" aria-live="polite">
        {last && last.matchRound === match.round && !animating && (
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
                <span className="font-semibold text-turf">À toi de tirer</span> avec{" "}
                <strong>{shooter?.playerName}</strong> ({shooter?.rating}) face à {keeper?.playerName} : choisis ton
                côté.
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
