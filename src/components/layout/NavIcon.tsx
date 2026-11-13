import type { ReactNode } from "react";
import type { NavIcon as NavIconName } from "@/lib/navigation";

const PATHS: Record<NavIconName | "more", ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  booster: <path d="M7 3h10l-1 3 1 3-1 3 1 3-1 3 1 3H7l1-3-1-3 1-3-1-3 1-3z" />,
  collection: (
    <>
      <rect x="4" y="6" width="10" height="14" rx="1.5" />
      <path d="M9 4h9.5A1.5 1.5 0 0 1 20 5.5V17" />
    </>
  ),
  album: (
    <>
      <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
      <path d="M5 16a2 2 0 0 1 2-2h12" />
    </>
  ),
  market: <path d="M4 9 6 4h12l2 5M4 9h16v11H4zM9 20v-6h6v6" />,
  trade: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  draft: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M4 12h16" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M9 3v3h6V3M9 21v-3h6v3" />
    </>
  ),
  penalty: (
    <>
      <path d="M3 18V6h18v12" />
      <path d="M3 10h18M3 14h18M9 6v12M15 6v12" opacity="0.5" />
      <circle cx="12" cy="20" r="1.6" />
    </>
  ),
  ranking: <path d="M5 20v-6h4v6M10 20V9h4v11M15 20v-9h4v9" />,
  wiki: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16M6.5 6.5c3 2.5 8 2.5 11 0M6.5 17.5c3-2.5 8-2.5 11 0" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c1-3.5 3.8-5 7-5s6 1.5 7 5" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </>
  ),
};

export function NavIcon({ name, className = "h-5 w-5" }: { name: NavIconName | "more"; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
