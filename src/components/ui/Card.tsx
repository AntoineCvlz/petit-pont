import { clsx } from "clsx";
import type { CardTemplateView } from "@/lib/data/cards";
import { formatCollectionNumber, formatSerial } from "@/lib/format";
import { POSITION_LABELS, RARITY_LABELS, hasShine } from "@/lib/rarity";
import { Crest } from "./Crest";
import { Flag } from "./Flag";
import { HoloTilt } from "./HoloTilt";

type Size = "sm" | "md" | "lg";

const WIDTHS: Record<Size, string> = {
  sm: "w-[132px]",
  md: "w-[168px]",
  lg: "w-[240px]",
};

/** Portrait placeholder : silhouette stylisée teintée aux couleurs du club. */
function Silhouette({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="pp-sil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6eee8" stopOpacity="0.92" />
          <stop offset="1" stopColor="#e6eee8" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Maillot */}
      <path d="M14 100c2-20 13-30 26-33l10 7 10-7c13 3 24 13 26 33z" fill={color} />
      <path d="M40 67l10 7 10-7-3-3H43z" fill="rgba(0,0,0,0.25)" />
      {/* Tête et cou */}
      <path d="M42 50h16v16l-8 6-8-6z" fill="url(#pp-sil)" />
      <ellipse cx="50" cy="38" rx="15" ry="18" fill="url(#pp-sil)" />
    </svg>
  );
}

export type CardProps = {
  template: CardTemplateView;
  collectionTotal: number;
  serialNumber?: number;
  copies?: number;
  size?: Size;
  interactive?: boolean;
  className?: string;
};

export function Card({ template, collectionTotal, serialNumber, copies, size = "md", interactive = true, className }: CardProps) {
  const t = template;
  const shirt = t.club?.colorPrimary ?? "#2f4d3e";
  const isLimited = t.maxSupply !== null;
  const label = `${t.playerName}, ${RARITY_LABELS[t.rarity]}, note ${t.rating}`;

  const content = (
    <div className="pp-card-inner flex flex-col">
      {t.rarity === "speciale" && <div className="pp-holo" />}

      {/* Portrait */}
      <div
        className="pp-pitch relative aspect-[5/4.4] overflow-hidden"
        style={{ backgroundColor: `color-mix(in srgb, ${shirt} 22%, #0d1813)` }}
      >
        {t.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- image_url remplaçable, domaine libre
          <img src={t.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-x-[12%] bottom-0 top-[14%]">
            <Silhouette color={shirt} />
          </div>
        )}

        {/* Note + poste */}
        <div className="absolute top-1.5 left-2 z-[4] flex flex-col items-center leading-none">
          <span className={clsx("font-display font-extrabold text-chalk drop-shadow", size === "lg" ? "text-4xl" : size === "md" ? "text-3xl" : "text-2xl")}>
            {t.rating}
          </span>
          <span className="mt-0.5 font-display text-[10px] font-bold tracking-wider text-chalk/80" title={POSITION_LABELS[t.position]}>
            {t.position}
          </span>
        </div>

        {/* Drapeau + écusson */}
        <div className="absolute top-2 right-2 z-[4] flex flex-col items-center gap-1">
          <Flag nation={t.nation} className={size === "sm" ? "h-3 w-4" : "h-3.5 w-5"} />
          {t.club && <Crest club={t.club} className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} />}
        </div>

        {copies !== undefined && copies > 1 && (
          <span className="absolute bottom-1.5 right-1.5 z-[4] rounded-md bg-night-950/85 px-1.5 py-0.5 font-display text-xs font-bold text-chalk">
            ×{copies}
          </span>
        )}
      </div>

      {/* Bandeau nom */}
      <div className="relative z-[1] flex flex-1 flex-col border-t border-white/5 px-2 pt-1.5 pb-1.5">
        <p
          className={clsx(
            "truncate font-display font-extrabold tracking-wide text-chalk uppercase",
            size === "lg" ? "text-lg" : size === "md" ? "text-[15px]" : "text-[13px]",
          )}
        >
          {t.playerName}
        </p>
        <p className="truncate text-[11px] text-chalk-muted">
          {t.club?.name ?? "Sans club"} · {t.edition === "Base" ? t.season : t.edition}
        </p>
        <div className="mt-auto flex items-center justify-between pt-1 font-display text-[10px] font-semibold tracking-wider text-chalk-faint">
          <span className="tabular-nums">{formatCollectionNumber(t.collectionNumber, collectionTotal)}</span>
          <span className="font-bold uppercase" style={{ color: "var(--rarity)" }}>
            {RARITY_LABELS[t.rarity]}
          </span>
          {serialNumber !== undefined && isLimited ? (
            <span className="tabular-nums text-chalk-muted">{formatSerial(serialNumber, t.maxSupply)}</span>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );

  const shared = {
    className: clsx("pp-card aspect-[5/7.4] shrink-0", WIDTHS[size], className),
    "data-rarity": t.rarity,
    "data-shine": String(hasShine(t.rarity)),
    "data-interactive": String(interactive),
  } as const;

  if (t.rarity === "speciale") {
    return (
      <HoloTilt {...shared} role="img" aria-label={label}>
        {content}
      </HoloTilt>
    );
  }
  return (
    <div {...shared} role="img" aria-label={label}>
      {content}
    </div>
  );
}
