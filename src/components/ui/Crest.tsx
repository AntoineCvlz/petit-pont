import type { ClubView } from "@/lib/data/cards";

/** Écusson générique (bouclier aux couleurs du club + sigle). Aucun logo réel. */
export function Crest({ club, className = "h-6 w-6" }: { club: ClubView; className?: string }) {
  const label = club.shortName.slice(0, 4);
  return (
    <svg viewBox="0 0 24 28" className={className} role="img" aria-label={club.name}>
      <title>{club.name}</title>
      <path d="M12 1.5 22 5v8.5c0 6.2-4.3 10.7-10 13-5.7-2.3-10-6.8-10-13V5z" fill={club.colorPrimary} />
      <path d="M12 1.5 22 5v8.5c0 6.2-4.3 10.7-10 13z" fill={club.colorSecondary} opacity="0.35" />
      <path
        d="M12 1.5 22 5v8.5c0 6.2-4.3 10.7-10 13-5.7-2.3-10-6.8-10-13V5z"
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="1"
      />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize={label.length > 3 ? 5.6 : 7}
        fontWeight="800"
        fontFamily="var(--font-barlow-condensed), sans-serif"
        fill="#ffffff"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="0.6"
        paintOrder="stroke"
      >
        {label}
      </text>
    </svg>
  );
}
