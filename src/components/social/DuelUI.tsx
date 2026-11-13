"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { challengePlayer, declineDuel, playDuel, type SocialResult } from "@/lib/actions/social";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import type { Tactic } from "@/lib/data/farm";
import type { Duel } from "@/lib/data/social";
import { formatRelative } from "@/lib/format";

const TACTICS: { key: Tactic; label: string; hint: string }[] = [
  { key: "pressing", label: "Pressing", hint: "bat la possession" },
  { key: "possession", label: "Possession", hint: "bat la contre" },
  { key: "contre", label: "Contre", hint: "bat le pressing" },
];
export const TACTIC_LABEL: Record<Tactic, string> = { pressing: "Pressing", possession: "Possession", contre: "Contre-attaque" };

/** Une tactique par mi-temps. */
export function TacticPicker({ value, onChange }: { value: (Tactic | null)[]; onChange: (v: (Tactic | null)[]) => void }) {
  return (
    <div className="space-y-2">
      {[0, 1].map((half) => (
        <fieldset key={half} className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">{half === 0 ? "Première mi-temps" : "Seconde mi-temps"}</legend>
          <span className="w-20 text-xs text-chalk-muted">{half === 0 ? "1re mi-temps" : "2e mi-temps"}</span>
          {TACTICS.map((t) => {
            const on = value[half] === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                title={t.hint}
                onClick={() => onChange(half === 0 ? [t.key, value[1] ?? null] : [value[0] ?? null, t.key])}
                className={clsx(
                  "rounded-lg border px-2.5 py-1 text-sm transition-colors duration-150",
                  on ? "border-turf bg-turf/15 font-semibold" : "border-line-strong hover:border-white/40",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </fieldset>
      ))}
      <p className="text-xs text-chalk-faint">
        Pressing &gt; possession &gt; contre-attaque &gt; pressing. Ta force vient de ton onze de saison.
      </p>
    </div>
  );
}

function total(goals: number[] | null): number {
  return (goals ?? []).reduce((a, b) => a + b, 0);
}

/** Carte d'un match : score, mi-temps, tactiques révélées après le match, action si c'est à moi de jouer. */
/** compact : récapitulatif sans boutons (calendrier de ligue ; le choix se fait dans « À toi de jouer »). */
export function DuelCard({
  duel,
  meId,
  showLeague = false,
  compact = false,
}: {
  duel: Duel;
  meId: string;
  showLeague?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [tactics, setTactics] = useState<(Tactic | null)[]>([null, null]);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [pending, start] = useTransition();
  const iAmHome = duel.homeId === meId;
  const involved = iAmHome || duel.awayId === meId;
  const myTurn = involved && duel.status === "waiting" && (iAmHome ? !duel.homePlayed : !duel.awayPlayed);
  const canAct = myTurn && !compact;
  const played = duel.status === "played";
  const [h, a] = [total(duel.homeGoals), total(duel.awayGoals)];
  const outcome = played && involved ? ((iAmHome ? h - a : a - h) > 0 ? "win" : h === a ? "draw" : "loss") : null;
  const myDelta = iAmHome ? duel.homeEloDelta : duel.awayEloDelta;

  const statusLabel =
    duel.status === "waiting"
      ? myTurn
        ? `À toi de jouer · échéance ${formatRelative(duel.deadline)}`
        : involved
          ? "En attente de l'adversaire"
          : `À jouer · ${[duel.homePlayed ? null : duel.homeName, duel.awayPlayed ? null : duel.awayName].filter(Boolean).join(" et ")} doi${duel.homePlayed || duel.awayPlayed ? "t" : "vent"} choisir`
      : duel.status === "declined"
        ? "Défi refusé"
        : duel.status === "expired"
          ? "Défi expiré"
          : duel.status === "cancelled"
            ? "Défi retiré"
            : formatRelative(duel.playedAt ?? duel.createdAt);

  return (
    <article className={clsx("rounded-xl border bg-night-850 p-3", canAct ? "border-turf/60" : "border-line")}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={duel.homeName} url={duel.homeAvatar} />
          <span className="truncate text-sm font-semibold">{duel.homeName}</span>
        </span>
        <span
          className={clsx(
            "font-display text-xl font-extrabold tabular-nums",
            outcome === "win" && "text-success",
            outcome === "loss" && "text-danger",
          )}
        >
          {played ? `${h} – ${a}` : "vs"}
        </span>
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold">{duel.awayName}</span>
          <Avatar name={duel.awayName} url={duel.awayAvatar} />
        </span>
      </div>
      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-chalk-muted">
        <span>
          {showLeague && duel.round !== null ? `Journée ${duel.round} · ` : ""}
          {statusLabel}
        </span>
        {played && duel.kind === "friendly" && involved && myDelta !== null && (
          <span className={myDelta >= 0 ? "text-success" : "text-danger"}>
            {myDelta >= 0 ? "+" : ""}
            {myDelta} Elo
          </span>
        )}
      </p>
      {played && duel.homeGoals && duel.awayGoals && (
        <p className="mt-1 text-xs text-chalk-faint">
          Mi-temps {duel.homeGoals[0]}–{duel.awayGoals[0]} · forces {duel.homeStrength} / {duel.awayStrength}
          {duel.homeTactics && duel.awayTactics && (
            <>
              {" "}
              · {duel.homeName} : {duel.homeTactics.map((t) => TACTIC_LABEL[t]).join(" puis ")} · {duel.awayName} :{" "}
              {duel.awayTactics.map((t) => TACTIC_LABEL[t]).join(" puis ")}
            </>
          )}
        </p>
      )}
      {canAct && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <TacticPicker value={tactics} onChange={setTactics} />
          {result && !result.ok && <FormMessage>{result.message}</FormMessage>}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending || tactics.some((t) => t === null)}
              onClick={() =>
                start(async () => {
                  const r = await playDuel(duel.id, tactics as Tactic[]);
                  setResult(r);
                  router.refresh();
                })
              }
            >
              {pending ? "Coup d'envoi…" : "Valider mes tactiques"}
            </Button>
            {duel.kind === "friendly" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setResult(await declineDuel(duel.id));
                    router.refresh();
                  })
                }
              >
                Refuser
              </Button>
            )}
          </div>
        </div>
      )}
      {involved && duel.kind === "friendly" && duel.status === "waiting" && iAmHome && (
        <button
          type="button"
          className="mt-2 text-xs text-chalk-faint underline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await declineDuel(duel.id);
              router.refresh();
            })
          }
        >
          Retirer le défi
        </button>
      )}
    </article>
  );
}

export function ChallengeForm({ initialOpponent, hasSquad }: { initialOpponent: string; hasSquad: boolean }) {
  const router = useRouter();
  const [opponent, setOpponent] = useState(initialOpponent);
  const [tactics, setTactics] = useState<(Tactic | null)[]>([null, null]);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [pending, start] = useTransition();
  if (!hasSquad) {
    return (
      <p className="text-sm text-chalk-muted">
        Compose d&apos;abord ton onze sur la page{" "}
        <Link href="/saison" className="text-turf underline">
          Saison
        </Link>{" "}
        : c&apos;est lui qui joue tes matchs.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">Adversaire</span>
        <input
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          placeholder="Pseudo du joueur"
          className="h-9 w-full rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none"
        />
      </label>
      <TacticPicker value={tactics} onChange={setTactics} />
      {result && <FormMessage tone={result.ok ? "success" : "error"}>{result.message}</FormMessage>}
      <Button
        disabled={pending || !opponent.trim() || tactics.some((t) => t === null)}
        onClick={() =>
          start(async () => {
            const r = await challengePlayer(opponent, tactics as Tactic[]);
            setResult(r);
            if (r.ok) setTactics([null, null]);
            router.refresh();
          })
        }
      >
        {pending ? "Envoi…" : "Lancer le défi"}
      </Button>
    </div>
  );
}
