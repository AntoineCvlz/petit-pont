import { clsx } from "clsx";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import type { DraftCard } from "@/lib/data/draft";
import { draftChemistry, draftLinks, LINK_COLORS, LINK_LABELS, type DraftFormation, type LinkIdentity } from "@/lib/draft";

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
 * et collectif de chaque joueur. Rendu serveur, sans état.
 */
export function DraftPitch({
  formation,
  picks,
  currentSlot = null,
}: {
  formation: DraftFormation;
  picks: Partial<Record<string, DraftCard>>;
  currentSlot?: string | null;
}) {
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
      <svg viewBox="0 0 100 125" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
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
        return (
          <div
            key={s.key}
            className="absolute w-[19%] max-w-[92px] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {c ? (
              <div className="relative rounded-lg border border-white/15 bg-night-900/90 p-1 text-center shadow-lg">
                <div className="flex items-center justify-between px-0.5">
                  <span className="font-display text-sm leading-none font-extrabold text-chalk sm:text-base">{c.rating}</span>
                  <span className="flex items-center gap-0.5">
                    <Flag nation={c.nation} className="h-2.5 w-3.5" />
                    {c.club && <Crest club={c.club} className="h-3.5 w-3.5" />}
                  </span>
                </div>
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- photo détourée statique
                  <img src={c.imageUrl} alt="" className="mx-auto mt-0.5 h-8 w-8 object-cover object-top sm:h-11 sm:w-11" />
                )}
                <p className="truncate text-[10px] leading-tight font-semibold sm:text-[11px]">{shortName(c.playerName)}</p>
                <span
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-night-950 bg-night-800 font-display text-[10px] font-bold"
                  title={`Collectif : ${perSlot[s.key] ?? 0} / 10`}
                >
                  {perSlot[s.key] ?? 0}
                </span>
              </div>
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
