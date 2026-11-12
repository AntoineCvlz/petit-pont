import { clsx } from "clsx";
import { RARITY_LABELS, type Rarity } from "@/lib/rarity";

const STYLES: Record<Rarity, string> = {
  commune: "text-r-commune border-r-commune/40 bg-r-commune/10",
  rare: "text-r-rare border-r-rare/40 bg-r-rare/10",
  epique: "text-r-epique border-r-epique/40 bg-r-epique/10",
  legendaire: "text-r-legendaire border-r-legendaire/45 bg-r-legendaire/10",
  iconique: "text-r-iconique border-r-iconique/45 bg-r-iconique/10",
  speciale:
    "text-night-950 border-transparent bg-[linear-gradient(90deg,#7af0e0,#8fb4ff,#e59bff,#ffd88a)]",
};

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-1.5 py-px font-display text-[11px] font-bold tracking-wider uppercase",
        STYLES[rarity],
        className,
      )}
    >
      {RARITY_LABELS[rarity]}
    </span>
  );
}
