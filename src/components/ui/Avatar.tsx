import { clsx } from "clsx";
import { initials } from "@/lib/format";

const PALETTE = ["#2f6b4a", "#3a5a8c", "#7a4a8c", "#8c6a2f", "#8c3a4a", "#2f7a7a"];

function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

export function Avatar({ name, url, size = "sm" }: { name: string; url?: string | null; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-16 text-xl" : "h-8 w-8 text-xs";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar externe remplaçable
    return <img src={url} alt="" className={clsx("rounded-full object-cover", dims)} />;
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
