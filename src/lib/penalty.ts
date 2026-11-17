/** Tirs au but : types et règles partagés (affichage ; la base fait foi). */

export type Direction = "gauche" | "centre" | "droite";
export const DIRECTIONS: readonly Direction[] = ["gauche", "centre", "droite"];
export const DIRECTION_LABELS: Record<Direction, string> = { gauche: "Gauche", centre: "Centre", droite: "Droite" };

export type KickResult = "goal" | "saved" | "missed";
export type Kick = {
  n: number;
  side: "player" | "opponent";
  shooter: number;
  direction: Direction;
  dive: Direction;
  result: KickResult;
};

export const ROUND_LABELS: Record<number, string> = { 1: "Quart de finale", 2: "Demi-finale", 3: "Finale" };
export const ROUND_SHORT: Record<number, string> = { 1: "Quart", 2: "Demie", 3: "Finale" };

/** Tirs d'un camp, complétés jusqu'à 5 cases (puis tirs de mort subite). */
export function kickSlots(kicks: Kick[], side: Kick["side"]): (KickResult | null)[] {
  const done = kicks.filter((k) => k.side === side).map((k) => k.result);
  const other = kicks.filter((k) => k.side !== side).length;
  const len = Math.max(5, done.length, other);
  return Array.from({ length: len }, (_, i) => done[i] ?? null);
}

/** Qui tire le prochain penalty (le joueur commence chaque séance). */
export function nextSide(kicks: Kick[]): Kick["side"] {
  return kicks.length % 2 === 0 ? "player" : "opponent";
}

/** Index du tireur (0 à 4) pour le prochain tir d'un camp (rotation après 5). */
export function nextShooterIndex(kicks: Kick[], side: Kick["side"]): number {
  return kicks.filter((k) => k.side === side).length % 5;
}

type KickView = Pick<Kick, "side" | "result"> & Partial<Pick<Kick, "direction" | "dive">>;

/** Le gardien avait choisi le bon côté (ou était resté au centre sur un tir au centre) mais le tir est rentré. */
export function beatenKeeper(k: KickView): boolean {
  return k.result === "goal" && k.direction !== undefined && k.direction === k.dive;
}

/** Description du tir, cohérente avec l'animation (lucarne sur les côtés, en force au-dessus au centre…). */
export function kickMessage(k: KickView): string {
  const centre = k.direction === "centre";
  const known = k.direction !== undefined && k.dive !== undefined;
  if (k.side === "player") {
    if (k.result === "goal") {
      if (!known) return "BUT !";
      if (k.direction === k.dive) return centre ? "BUT ! En force, au-dessus du gardien" : "BUT ! En pleine lucarne, imparable";
      return centre ? "BUT ! Plein centre, le gardien a plongé" : "BUT ! Le gardien part du mauvais côté";
    }
    if (k.result === "saved") return known ? "Arrêté ! Le gardien avait deviné" : "Arrêté par le gardien…";
    return centre ? "Au-dessus de la barre !" : "À côté !";
  }
  if (k.result === "goal") {
    if (!known) return "Il marque…";
    if (k.direction === k.dive) return centre ? "Bien vu… mais il frappe en force au-dessus" : "Bon côté… mais en pleine lucarne";
    return centre ? "Il marque plein centre…" : "Il marque, ton gardien part du mauvais côté…";
  }
  if (k.result === "saved") return "ARRÊT DE TON GARDIEN !";
  return centre ? "Il envoie le ballon au-dessus !" : "Il rate le cadre !";
}

/** Repères de la scène (viewBox 0 0 100 60) : cage de x 14 à 86, barre à y 8, ligne de but à y 34. */
export const SCENE = { spot: { x: 50, y: 52 }, keeper: { x: 50, y: 34 } } as const;
const ZONE_X: Record<Direction, number> = { gauche: 27, centre: 50, droite: 73 };

export type KickPath = {
  /** Point d'arrivée du ballon (taille réduite : il s'éloigne). */
  ball: { x: number; y: number; scale: number };
  /** Rebond après un arrêt (ballon repoussé), sinon null. */
  rebound: { x: number; y: number } | null;
  /** Position finale du gardien (pieds) et inclinaison du plongeon. */
  keeper: { x: number; y: number; rotate: number };
  /** Filet qui tremble (but). */
  net: boolean;
};

/** Trajectoire du ballon et plongeon du gardien d'après le résultat calculé par la base. */
export function kickPath(k: Pick<Kick, "direction" | "dive" | "result">): KickPath {
  const side = k.direction === "gauche" ? -1 : k.direction === "droite" ? 1 : 0;
  const diveSide = k.dive === "gauche" ? -1 : k.dive === "droite" ? 1 : 0;
  const keeper = {
    x: 50 + diveSide * 19, // le plongeon reste entre les poteaux
    y: SCENE.keeper.y - (diveSide === 0 ? 3 : 5),
    rotate: diveSide * 72,
  };
  if (k.result === "missed") {
    return {
      ball: side === 0 ? { x: 50, y: 1, scale: 0.5 } : { x: 50 + side * 43, y: 13, scale: 0.5 },
      rebound: null,
      keeper,
      net: false,
    };
  }
  if (k.result === "saved") {
    return {
      ball: { x: ZONE_X[k.direction], y: side === 0 ? 20 : 23, scale: 0.6 },
      rebound: { x: ZONE_X[k.direction] + (side === 0 ? 14 : side * 20), y: 46 },
      keeper,
      net: false,
    };
  }
  // But : gardien du bon côté → lucarne (ou en force au-dessus au centre) ; sinon à mi-hauteur
  if (k.direction === k.dive) {
    return { ball: { x: side === 0 ? 50 : 50 + side * 32, y: 11, scale: 0.55 }, rebound: null, keeper, net: true };
  }
  return { ball: { x: ZONE_X[k.direction], y: 25, scale: 0.6 }, rebound: null, keeper, net: true };
}
