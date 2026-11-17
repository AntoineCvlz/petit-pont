import type { StyleIconName } from "@/lib/booster-themes";

/** Pictogrammes des boosters « style de jeu » (trait, couleur du paquet). */
const PATHS: Record<StyleIconName, React.ReactNode> = {
  // Ballon et trajectoire en zigzag (crochets)
  dribble: (
    <>
      <path d="M4 20l4-5-3-4 5-4-2-3" strokeDasharray="0.1 2.6" />
      <circle cx="16.5" cy="7.5" r="4.5" />
      <path d="M16.5 4.6l2.2 1.6-.8 2.6h-2.8l-.8-2.6z" fill="currentColor" stroke="none" />
    </>
  ),
  // Deux crampons symétriques
  feet: (
    <>
      <path d="M4 17c0-3 1.5-4.5 2.5-7.5S7.5 4 9.5 4 11 7 11 9.5 10 17 10 17c0 1.5-1.2 2.5-3 2.5S4 18.5 4 17z" />
      <path d="M20 17c0-3-1.5-4.5-2.5-7.5S16.5 4 14.5 4 13 7 13 9.5s1 7.5 1 7.5c0 1.5 1.2 2.5 3 2.5s3-1 3-2.5z" />
    </>
  ),
  // Éclair et traînées de vitesse
  speed: (
    <>
      <path d="M14 3L7.5 13h5L10 21l7-11h-5z" fill="currentColor" fillOpacity="0.25" />
      <path d="M2.5 9h3M1.5 13h4M2.5 17h3" />
    </>
  ),
  // Cage et ballon dans la lucarne
  target: (
    <>
      <path d="M3 20V7h18v13" />
      <path d="M3 11h18M3 15h18M7.5 7v13M12 7v13M16.5 7v13" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="17.5" cy="9.5" r="2.4" fill="currentColor" />
    </>
  ),
  // Mur de briques
  wall: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" />
    </>
  ),
  // Gant de gardien
  glove: (
    <>
      <path d="M7 21v-3.5L4.5 13c-.8-1.5.8-2.7 2-1.6L8 13V5.5a1.3 1.3 0 012.6 0V11V4a1.3 1.3 0 012.6 0v7V5a1.3 1.3 0 012.6 0v6.5V7.5a1.3 1.3 0 012.6 0V15c0 2.5-1.3 3.5-2.4 4.5V21z" />
      <path d="M7 18h10" />
    </>
  ),
  // Étoile montante
  star: (
    <>
      <path
        d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6L3.4 9.3l6-.7z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <path d="M12 21.5v-2" />
    </>
  ),
};

export function StyleIcon({ icon, className }: { icon: StyleIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[icon]}
    </svg>
  );
}
