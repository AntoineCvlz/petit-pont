import { clsx } from "clsx";
import { LogoMark } from "@/components/brand/Logo";
import type { BoosterKind } from "@/lib/boosters";
import { BOOSTER_KIND_LABELS } from "@/lib/boosters";
import { boosterTheme, type BoosterTheme } from "@/lib/booster-themes";
import { flagUrl } from "@/lib/flags";
import { StyleIcon } from "./StyleIcon";

/** Habillage par type de booster (illustration 100 % CSS, `image_url` prioritaire). */
const SKINS: Record<BoosterKind, { foil: string; ink: string }> = {
  free: {
    foil: "linear-gradient(160deg,#2c5a3c,#163023 55%,#3f7a52)",
    ink: "#a8e283",
  },
  standard: {
    foil: "linear-gradient(160deg,#35506b,#18283a 55%,#4d7194)",
    ink: "#a9d4ff",
  },
  premium: {
    foil: "linear-gradient(160deg,#7a5a1c,#2e2108 50%,#c9952f 80%,#6b4a10)",
    ink: "#ffd27a",
  },
  event: {
    foil: "linear-gradient(160deg,#3b2a6b,#140d2b 55%,#5d3fa3)",
    ink: "#d7c2ff",
  },
  limited: {
    foil: "linear-gradient(160deg,#6b1f33,#24070f 50%,#b3304f 80%,#5a1427)",
    ink: "#ffb3c2",
  },
};

/** Emblème du thème, posé dans le rond central du paquet. */
function Emblem({ theme, name }: { theme: BoosterTheme; name: string }) {
  const e = theme.emblem;
  if (e.type === "league") {
    return (
      <div
        className="h-full w-full bg-current drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
        style={{
          mask: `url(${e.src}) center / contain no-repeat`,
          WebkitMask: `url(${e.src}) center / contain no-repeat`,
        }}
        aria-hidden="true"
      />
    );
  }
  if (e.type === "flag") {
    const url = flagUrl(e.code);
    return (
      <div className="relative h-full w-full overflow-hidden rounded-full shadow-[0_0_0_2px_currentColor,0_6px_14px_-4px_rgba(0,0,0,0.8)]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- petit SVG statique
          <img src={url} alt="" className="h-full w-full scale-110 object-cover saturate-[0.85]" aria-label={name} />
        )}
        {/* Reflet et vignettage pour fondre le drapeau dans le paquet */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle,transparent_55%,rgba(0,0,0,0.45))]" />
      </div>
    );
  }
  return <StyleIcon icon={e.icon} className="h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />;
}

export function BoosterPack({
  name,
  kind,
  slug,
  cardsCount,
  imageUrl,
  size = "md",
  className,
}: {
  name: string;
  kind: BoosterKind;
  slug?: string;
  cardsCount: number;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const theme = boosterTheme(slug);
  const skin = theme ?? SKINS[kind];
  const width = size === "lg" ? "w-[200px]" : size === "md" ? "w-[150px]" : "w-[110px]";

  return (
    <div
      className={clsx("pp-pack relative aspect-[5/8] shrink-0 overflow-hidden", width, className)}
      style={{
        background: imageUrl ? `center/cover url(${imageUrl})` : skin.foil,
        color: skin.ink,
      }}
      role="img"
      aria-label={`Booster ${name}`}
    >
      {!imageUrl && (
        <>
          <div className="pp-net absolute inset-0 opacity-70" />
          <div className="absolute inset-x-0 top-[38%] h-px bg-current opacity-25" />
          <div className="absolute top-[38%] left-1/2 aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-25" />
          {theme ? (
            <>
              <div className="absolute top-[38%] left-1/2 aspect-square w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-10 blur-xl" />
              <div
                className={clsx(
                  "absolute top-[38%] left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2",
                  theme.emblem.type === "flag" ? "w-[42%]" : "w-[52%]",
                )}
              >
                <Emblem theme={theme} name={name} />
              </div>
              <LogoMark
                className={clsx("absolute top-[7%] left-[8%] opacity-90", size === "sm" ? "h-4 w-4" : "h-6 w-6")}
              />
              <div className="relative flex h-full flex-col items-center justify-end gap-[6%] px-2 pb-[14%] text-center">
                <div>
                  <p
                    className={clsx(
                      "font-display leading-none font-extrabold uppercase italic",
                      size === "sm" ? "text-sm" : "text-lg",
                    )}
                  >
                    {name}
                  </p>
                  <p className="mt-1 font-display text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">
                    {theme.label}
                  </p>
                </div>
                <p className="font-display text-xs font-bold tracking-wider uppercase opacity-90">
                  {cardsCount} cartes
                </p>
              </div>
            </>
          ) : (
            <div className="relative flex h-full flex-col items-center justify-between px-2 pt-[16%] pb-[14%] text-center">
              <LogoMark className={size === "sm" ? "h-7 w-7" : "h-10 w-10"} />
              <div>
                <p
                  className={clsx(
                    "font-display leading-none font-extrabold uppercase italic",
                    size === "sm" ? "text-sm" : "text-lg",
                  )}
                >
                  {name}
                </p>
                <p className="mt-1 font-display text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">
                  {BOOSTER_KIND_LABELS[kind]}
                </p>
              </div>
              <p className="font-display text-xs font-bold tracking-wider uppercase opacity-90">{cardsCount} cartes</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
