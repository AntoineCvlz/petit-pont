import { clsx } from "clsx";

/**
 * Emblème Petit Pont : une arche (les jambes du défenseur) sous laquelle file le ballon.
 * Lisible en petit (favicon, barre mobile).
 */
export function LogoMark({ className, title = "Petit Pont" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label={title}>
      <rect width="32" height="32" rx="8" fill="#112019" />
      {/* Arche */}
      <path
        d="M6.5 26V15.5C6.5 10.25 10.75 6 16 6s9.5 4.25 9.5 9.5V26"
        fill="none"
        stroke="#e6eee8"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Ligne de sol */}
      <path d="M3.5 26.5h25" stroke="#8fd16a" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      {/* Traînée du ballon */}
      <path d="M8.5 22.2h3.4M7.5 19.6h2.6" stroke="#8fd16a" strokeWidth="1.4" strokeLinecap="round" />
      {/* Ballon */}
      <circle cx="17.5" cy="21.2" r="4" fill="#8fd16a" />
      <path d="M17.5 18.6l1.6 1.2-.6 1.9h-2l-.6-1.9z" fill="#0b1a10" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="font-display text-xl leading-none font-extrabold tracking-wide uppercase italic">
        Petit<span className="text-turf">Pont</span>
      </span>
    </span>
  );
}
