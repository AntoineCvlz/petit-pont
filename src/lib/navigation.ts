export type NavIcon = "home" | "booster" | "collection" | "album" | "market" | "trade" | "ranking" | "wiki" | "profile";

export type NavItem = { href: string; label: string; icon: NavIcon };

/**
 * Navigation du jeu, dans l'ordre de la spec.
 * Règle « aucune fausse fonctionnalité » : une entrée n'est listée ici
 * qu'une fois la page réellement disponible. Les autres arrivent avec leur phase :
 *   Marché (5) · Échanges (6) · Classement (7)
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/boosters", label: "Boosters", icon: "booster" },
  { href: "/collection", label: "Collection", icon: "collection" },
  { href: "/albums", label: "Albums", icon: "album" },
  { href: "/wiki", label: "Wiki des joueurs", icon: "wiki" },
  { href: "/profil", label: "Profil", icon: "profile" },
];

/** Barre mobile : 5 entrées max ; au-delà, les 4 premières + « Plus ». */
export function splitMobileNav(items: readonly NavItem[], max = 5): { primary: NavItem[]; more: NavItem[] } {
  if (items.length <= max) return { primary: [...items], more: [] };
  return { primary: items.slice(0, max - 1), more: items.slice(max - 1) };
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
