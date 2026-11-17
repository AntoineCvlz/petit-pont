import { clsx } from "clsx";
import { Silhouette } from "@/components/ui/Card";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import type { DraftCard } from "@/lib/data/draft";
import {
  draftChemistry,
  draftLinks,
  LINK_COLORS,
  LINK_LABELS,
  type DraftFormation,
  type LinkIdentity,
} from "@/lib/draft";

function identity(c: DraftCard): LinkIdentity {
  return {
    club: c.club?.code ?? null,
    league: c.leagueCode,
    nation: c.nation.code,
  };
}

function shortName(name: string): string {
  if (name.length <= 12) return name;
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

/**
 * Terrain du draft : postes de la formation, liens entre voisins (vert / orange / rouge, gris si incomplet)
 * et collectif de chaque joueur. Sans état ; `onSlotClick` rend les joueurs cliquables (échange, DraftPitchEditor).
 */
export function DraftPitch({
  formation,
  picks,
  currentSlot = null,
  selected = null,
  onSlotClick,
}: {
  formation: DraftFormation;
  picks: Partial<Record<string, DraftCard>>;
  currentSlot?: string | null;
  selected?: string | null;
  onSlotClick?: (slotKey: string) => void;
}) {
  const selectedPos = selected ? formation.slots.find((s) => s.key === selected)?.pos : undefined;
  const identities = Object.fromEntries(Object.entries(picks).map(([k, c]) => [k, identity(c!)]));
  const links = draftLinks(formation, identities);
  const { perSlot } = draftChemistry(formation, identities);
  const pos = new Map(formation.slots.map((s) => [s.key, s]));

  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-[560px] overflow-hidden rounded-xl border border-white/10"
      style={{
        background: "repeating-linear-gradient(0deg, #1d5a35 0 10%, #1a5230 10% 20%)",
      }}
    >
      {/* Marquages */}
      <svg
        viewBox="0 0 100 125"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <g fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5">
          <rect x="3" y="3" width="94" height="119" />
          <line x1="3" y1="62.5" x2="97" y2="62.5" />
          <circle cx="50" cy="62.5" r="10" />
          <rect x="25" y="3" width="50" height="16" />
          <rect x="25" y="106" width="50" height="16" />
        </g>
      </svg>

      {/* Liens */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {links.map((l) => {
          const a = pos.get(l.a)!;
          const b = pos.get(l.b)!;
          return (
            <line
              key={`${l.a}-${l.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={l.strength === null ? "rgba(255,255,255,0.25)" : LINK_COLORS[l.strength]}
              strokeWidth={l.strength === null ? 1.5 : 3}
              strokeDasharray={l.strength === null ? "4 4" : undefined}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            >
              {l.strength !== null && <title>{`${l.a} – ${l.b} : ${LINK_LABELS[l.strength]}`}</title>}
            </line>
          );
        })}
      </svg>

      {/* Postes */}
      {formation.slots.map((s) => {
        const c = picks[s.key];
        const active = currentSlot === s.key;
        const isSelected = selected === s.key;
        const isTarget = !!selected && !isSelected && !!c && s.pos === selectedPos;
        const dimmed = !!selected && !isSelected && !isTarget;
        const cardEl = c ? (
          <div
            className={clsx(
              "relative overflow-hidden rounded-lg border-2 text-center shadow-lg transition-[box-shadow,transform] duration-150",
              isSelected ? "-translate-y-1 ring-4 ring-turf/50" : isTarget ? "ring-2 ring-turf/40" : "",
              dimmed && "opacity-45",
            )}
            style={{
              borderColor: isSelected || isTarget ? "var(--color-turf)" : `var(--color-r-${c.rarity})`,
              // Fond aux couleurs du club, comme sur les cartes (plus de fond noir derrière le portrait)
              background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${c.club?.colorSecondary ?? "#8fd16a"} 35%, transparent), transparent 70%), color-mix(in srgb, ${c.club?.colorPrimary ?? "#2f4d3e"} 45%, #10201a)`,
            }}
          >
            <div className="relative h-11 sm:h-[60px]">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- photo détourée statique
                <img
                  src={c.imageUrl}
                  alt=""
                  className="absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain object-bottom"
                />
              ) : (
                <div className="absolute inset-x-[18%] bottom-0 top-[10%]">
                  <Silhouette color={c.club?.colorPrimary ?? "#2f4d3e"} />
                </div>
              )}
              <span className="absolute top-0.5 left-1 font-display text-sm leading-none font-extrabold text-chalk [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] sm:text-base">
                {c.rating}
              </span>
              <span className="absolute top-0.5 right-1 flex flex-col items-center gap-0.5">
                <Flag nation={c.nation} className="h-2.5 w-3.5" />
                {c.club && <Crest club={c.club} className="h-3.5 w-3.5" />}
              </span>
            </div>
            <p className="truncate bg-night-950/75 px-0.5 py-0.5 text-[10px] leading-tight font-semibold sm:text-[11px]">
              {shortName(c.playerName)}
            </p>
          </div>
        ) : null;
        return (
          <div
            key={s.key}
            className="absolute w-[19%] max-w-[92px] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {c && (
              <span
                className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-night-950 bg-night-800 font-display text-[10px] font-bold"
                title={`Collectif : ${perSlot[s.key] ?? 0} / 10`}
              >
                {perSlot[s.key] ?? 0}
              </span>
            )}
            {c ? (
              onSlotClick ? (
                <button
                  type="button"
                  onClick={() => onSlotClick(s.key)}
                  disabled={dimmed}
                  className="block w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf disabled:cursor-not-allowed"
                  aria-pressed={isSelected}
                  aria-label={
                    isSelected
                      ? `${c.playerName} sélectionné : choisis un joueur de la même ligne`
                      : isTarget
                        ? `Échanger avec ${c.playerName}`
                        : `Déplacer ${c.playerName}`
                  }
                >
                  {cardEl}
                </button>
              ) : (
                cardEl
              )
            ) : (
              <div
                className={clsx(
                  "mx-auto flex aspect-square w-[62%] items-center justify-center rounded-full border-2 border-dashed font-display text-[11px] font-bold sm:text-xs",
                  active
                    ? "border-turf bg-turf/25 text-chalk ring-4 ring-turf/30"
                    : "border-white/30 bg-night-950/40 text-chalk-muted",
                )}
                aria-current={active ? "step" : undefined}
              >
                {s.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
