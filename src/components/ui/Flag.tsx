import type { ReactNode } from "react";
import type { NationView } from "@/lib/data/cards";
import { flagUrl } from "@/lib/flags";

/** Drapeau de la nation : fichier SVG s'il existe, sinon drapeau stylisé généré à partir de ses couleurs. */
export function Flag({ nation, className = "h-3.5 w-5" }: { nation: NationView; className?: string }) {
  const url = flagUrl(nation.code);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- petit SVG statique
      <img
        src={url}
        alt={nation.name}
        title={nation.name}
        loading="lazy"
        decoding="async"
        className={`${className} rounded-[1px] object-cover shadow-[0_0_0_0.5px_rgba(0,0,0,0.45)]`}
      />
    );
  }
  const c = nation.flagColors;
  const n = c.length;
  let body: ReactNode;

  switch (nation.flagLayout) {
    case "h":
      body = c.map((color, i) => <rect key={i} x="0" y={(i * 14) / n} width="20" height={14 / n + 0.05} fill={color} />);
      break;
    case "nordic":
      body = (
        <>
          <rect width="20" height="14" fill={c[0]} />
          {n > 2 && (
            <>
              <rect x="5" y="0" width="4" height="14" fill={c[1]} />
              <rect x="0" y="5" width="20" height="4" fill={c[1]} />
            </>
          )}
          <rect x="6" y="0" width="2" height="14" fill={c[n - 1]} />
          <rect x="0" y="6" width="20" height="2" fill={c[n - 1]} />
        </>
      );
      break;
    case "cross":
      body = (
        <>
          <rect width="20" height="14" fill={c[0]} />
          <rect x="8.5" y="0" width="3" height="14" fill={c[1]} />
          <rect x="0" y="5.5" width="20" height="3" fill={c[1]} />
        </>
      );
      break;
    case "disc":
      body = (
        <>
          <rect width="20" height="14" fill={c[0]} />
          <circle cx="10" cy="7" r="3.6" fill={c[1]} />
        </>
      );
      break;
    default:
      body = c.map((color, i) => <rect key={i} x={(i * 20) / n} y="0" width={20 / n + 0.05} height="14" fill={color} />);
  }

  return (
    <svg viewBox="0 0 20 14" className={className} role="img" aria-label={nation.name}>
      <title>{nation.name}</title>
      {body}
      <rect width="20" height="14" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
    </svg>
  );
}
