import { RARITY_LABELS, type Rarity } from "@/lib/rarity";

/** Emplacement manquant : grisé, avec numéro, rareté et silhouette. */
export function MissingSlot({ slotNumber, rarity }: { slotNumber: number; rarity: Rarity }) {
  return (
    <div
      className="flex aspect-[5/7.4] w-[168px] flex-col items-center justify-between rounded-[var(--radius-card)] border-2 border-dashed bg-night-850/60 p-2 max-sm:w-[132px]"
      style={{ borderColor: `color-mix(in srgb, var(--color-r-${rarity}) 35%, transparent)` }}
      role="img"
      aria-label={`Emplacement ${slotNumber} manquant, ${RARITY_LABELS[rarity]}`}
    >
      <span className="self-start font-display text-2xl font-extrabold text-chalk-faint tabular-nums">{String(slotNumber).padStart(2, "0")}</span>
      <svg viewBox="0 0 100 100" className="w-3/4 opacity-25" aria-hidden="true">
        <path d="M14 100c2-20 13-30 26-33l10 7 10-7c13 3 24 13 26 33z" fill="currentColor" />
        <path d="M42 50h16v16l-8 6-8-6z" fill="currentColor" />
        <ellipse cx="50" cy="38" rx="15" ry="18" fill="currentColor" />
      </svg>
      <span className="font-display text-[11px] font-bold tracking-wider uppercase" style={{ color: `var(--color-r-${rarity})`, opacity: 0.7 }}>
        {RARITY_LABELS[rarity]}
      </span>
    </div>
  );
}
