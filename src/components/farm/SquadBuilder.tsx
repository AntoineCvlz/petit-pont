"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { saveSeasonSquad } from "@/lib/actions/farm";
import { DraftPitch } from "@/components/draft/DraftPitch";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { RarityBadge } from "@/components/ui/RarityBadge";
import type { DraftCard } from "@/lib/data/draft";
import { draftChemistry, type DraftFormation } from "@/lib/draft";

export type SquadCard = { instanceId: string; card: DraftCard };

const OUT_OF_POSITION = 15;

function effective(c: DraftCard, pos: string): number {
  return c.position === pos ? c.rating : c.rating - OUT_OF_POSITION;
}

/** Composition automatique : poste par poste, la meilleure carte du bon poste (footballeurs distincts). */
function autoFill(formation: DraftFormation, roster: SquadCard[]): Record<string, string> {
  const used = new Set<string>();
  const slots: Record<string, string> = {};
  const sorted = [...roster].sort((a, b) => b.card.rating - a.card.rating);
  for (const s of formation.slots) {
    const pick =
      sorted.find((r) => r.card.position === s.pos && !used.has(r.card.playerSlug)) ??
      sorted.find((r) => !used.has(r.card.playerSlug));
    if (!pick) continue;
    used.add(pick.card.playerSlug);
    slots[s.key] = pick.instanceId;
  }
  return slots;
}

export function SquadBuilder({
  formations,
  roster,
  initial,
  locked,
}: {
  formations: DraftFormation[];
  roster: SquadCard[];
  initial: { formation: string; slots: Record<string, string> } | null;
  locked: boolean;
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(roster.map((r) => [r.instanceId, r])), [roster]);
  const [code, setCode] = useState(initial?.formation ?? formations[0]!.code);
  const formation = formations.find((f) => f.code === code)!;
  const [slots, setSlots] = useState<Record<string, string>>(() =>
    initial ? Object.fromEntries(Object.entries(initial.slots).filter(([, id]) => byId.has(id))) : autoFill(formation, roster),
  );
  const [active, setActive] = useState<string>(formation.slots[0]!.key);
  const [anyPosition, setAnyPosition] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const picks: Record<string, DraftCard> = {};
  for (const s of formation.slots) {
    const r = slots[s.key] ? byId.get(slots[s.key]!) : undefined;
    if (r) picks[s.key] = r.card;
  }
  const placed = formation.slots.filter((s) => picks[s.key]);
  const rating = placed.length ? placed.reduce((sum, s) => sum + effective(picks[s.key]!, s.pos), 0) / placed.length : 0;
  const chem = draftChemistry(
    formation,
    Object.fromEntries(
      Object.entries(picks).map(([k, c]) => [k, { club: c.club?.code ?? null, league: c.leagueCode, nation: c.nation.code }]),
    ),
  ).total;
  const activeSlot = formation.slots.find((s) => s.key === active) ?? formation.slots[0]!;
  const usedPlayers = new Set(
    Object.entries(slots)
      .filter(([k]) => k !== activeSlot.key)
      .map(([, id]) => byId.get(id)?.card.playerSlug),
  );
  const choices = roster
    .filter((r) => anyPosition || r.card.position === activeSlot.pos)
    .filter((r) => !usedPlayers.has(r.card.playerSlug))
    .sort((a, b) => effective(b.card, activeSlot.pos) - effective(a.card, activeSlot.pos))
    .slice(0, 60);

  function changeFormation(next: string) {
    const f = formations.find((x) => x.code === next)!;
    setCode(next);
    setSlots(autoFill(f, roster));
    setActive(f.slots[0]!.key);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,520px)_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-chalk-muted" htmlFor="formation">
            Formation
          </label>
          <select
            id="formation"
            value={code}
            onChange={(e) => changeFormation(e.target.value)}
            disabled={locked}
            className="h-9 rounded-lg border border-line-strong bg-night-900 px-2 text-sm"
          >
            {formations.map((f) => (
              <option key={f.code} value={f.code}>
                {f.name}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm">
            Note <strong className="tabular-nums">{rating.toFixed(1)}</strong> · Collectif{" "}
            <strong className="tabular-nums">{chem}</strong> · Force{" "}
            <strong className="text-turf tabular-nums">{(rating + chem / 10).toFixed(1)}</strong>
          </span>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <DraftPitch formation={formation} picks={picks} currentSlot={picks[active] ? null : active} />
          <div className="absolute inset-0">
            {formation.slots.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                aria-label={`Poste ${s.label}${picks[s.key] ? ` : ${picks[s.key]!.playerName}` : " (vide)"}`}
                aria-pressed={active === s.key}
                className={clsx(
                  "absolute h-[16%] w-[19%] max-w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-lg",
                  active === s.key ? "ring-2 ring-turf" : "hover:ring-2 hover:ring-white/40",
                )}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display font-extrabold tracking-wide uppercase">
            Poste {activeSlot.label} <span className="text-sm font-normal text-chalk-muted normal-case">({activeSlot.pos})</span>
          </p>
          <label className="ml-auto flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={anyPosition} onChange={(e) => setAnyPosition(e.target.checked)} /> Tous postes (−
            {OUT_OF_POSITION} hors poste)
          </label>
        </div>
        <ul className="max-h-[420px] divide-y divide-line overflow-auto rounded-xl border border-line">
          {choices.length === 0 && (
            <li className="p-3 text-sm text-chalk-muted">Aucune carte pour ce poste : coche « Tous postes ».</li>
          )}
          {choices.map((r) => {
            const on = slots[activeSlot.key] === r.instanceId;
            const off = r.card.position !== activeSlot.pos;
            return (
              <li key={r.instanceId}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setSlots((prev) => ({ ...prev, [activeSlot.key]: r.instanceId }));
                    const next = formation.slots.find((s) => !slots[s.key] && s.key !== activeSlot.key);
                    if (next) setActive(next.key);
                  }}
                  className={clsx("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-night-800", on && "bg-turf/10")}
                >
                  <span className="w-8 text-center font-display font-extrabold tabular-nums">
                    {effective(r.card, activeSlot.pos)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.card.playerName}</span>
                    <span className="block truncate text-xs text-chalk-faint">
                      {r.card.position}
                      {off && <span className="text-coin"> · hors poste</span>} · {r.card.club?.name ?? "Sans club"} ·{" "}
                      {r.card.nation.name}
                    </span>
                  </span>
                  <RarityBadge rarity={r.card.rarity} />
                </button>
              </li>
            );
          })}
        </ul>
        {message && <FormMessage tone={message.ok ? "success" : "error"}>{message.text}</FormMessage>}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={locked} onClick={() => setSlots(autoFill(formation, roster))}>
            Composition automatique
          </Button>
          <Button
            size="sm"
            disabled={locked || pending || placed.length !== 11}
            onClick={() =>
              start(async () => {
                const r = await saveSeasonSquad(code, slots);
                setMessage(r.ok ? { ok: true, text: "Équipe enregistrée." } : { ok: false, text: r.message });
                router.refresh();
              })
            }
          >
            {pending ? "Enregistrement…" : `Enregistrer l'équipe (${placed.length}/11)`}
          </Button>
        </div>
        {locked && (
          <p className="text-xs text-chalk-faint">Équipe verrouillée pendant la mi-temps : termine d&apos;abord le match.</p>
        )}
      </div>
    </div>
  );
}
