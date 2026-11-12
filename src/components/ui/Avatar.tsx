import { clsx } from "clsx";
import { initials } from "@/lib/format";

// Couleurs assez sombres pour un texte clair (contraste ≥ 4,5:1)
const PALETTE = ["#2a5f42", "#34507d", "#6b4180", "#6b5120", "#7d3442", "#286868"];

function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

export function Avatar({ name, url, size = "sm" }: { name: string; url?: string | null; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-16 text-xl" : "h-8 w-8 text-xs";
  if (url) {
    // Photo de profil Discord (CDN Discord uniquement, garanti par la base)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image du CDN Discord, déjà dimensionnée
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={clsx("shrink-0 rounded-full bg-night-800 object-cover ring-1 ring-white/10", dims)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-chalk ring-1 ring-white/10", dims)}
      style={{ backgroundColor: colorFor(name) }}
    >
      {initials(name)}
    </span>
  );
}
