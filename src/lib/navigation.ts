export type NavIcon =
  | "home"
  | "booster"
  | "collection"
  | "album"
  | "market"
  | "trade"
  | "ranking"
  | "wiki"
  | "profile"
  | "draft"
  | "penalty"
  | "play";

export type NavItem = { href: string; label: string; icon: NavIcon };

/**
 * Navigation du jeu, dans l'ordre de la spec.
 * Règle « aucune fausse fonctionnalité » : une entrée n'est listée qu'une fois la page disponible.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/boosters", label: "Boosters", icon: "booster" },
  { href: "/jouer", label: "Jouer", icon: "play" },
  { href: "/collection", label: "Collection", icon: "collection" },
  { href: "/albums", label: "Albums", icon: "album" },
  { href: "/marche", label: "Marché", icon: "market" },
  { href: "/echanges", label: "Échanges", icon: "trade" },
  { href: "/classement", label: "Classement", icon: "ranking" },
  { href: "/wiki", label: "Wiki des joueurs", icon: "wiki" },
  { href: "/profil", label: "Profil", icon: "profile" },
];

/** Barre mobile : 5 entrées max ; au-delà, les 4 premières + « Plus ». */
export function splitMobileNav(items: readonly NavItem[], max = 5): { primary: NavItem[]; more: NavItem[] } {
  if (items.length <= max) return { primary: [...items], more: [] };
  return { primary: items.slice(0, max - 1), more: items.slice(max - 1) };
}

/** Modes de jeu regroupés sous l'entrée « Jouer ». */
export const PLAY_PATHS = [
  "/jouer",
  "/saison",
  "/defis",
  "/missions",
  "/draft",
  "/penalty",
  "/matchs",
  "/ligues",
  "/clans",
] as const;

function underPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/jouer") return PLAY_PATHS.some((p) => underPath(pathname, p));
  return underPath(pathname, href);
}
