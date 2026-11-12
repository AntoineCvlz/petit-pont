import type { ClubView } from "@/lib/data/cards";

/**
 * Écusson du club : logo (crest_url) s'il est renseigné, sinon bouclier générique aux couleurs du club.
 * Le léger halo garde lisibles les logos sombres (Juventus…) sur le fond des cartes.
 */
export function Crest({ club, className = "h-6 w-6" }: { club: ClubView; className?: string }) {
  if (club.crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- petit fichier statique, crest_url remplaçable
      <img
        src={club.crestUrl}
        alt={club.name}
        title={club.name}
        loading="lazy"
        decoding="async"
        className={`${className} object-contain drop-shadow-[0_0_1.5px_rgba(255,255,255,0.75)]`}
      />
    );
  }
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
