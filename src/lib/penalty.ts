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

export function kickMessage(k: Pick<Kick, "side" | "result">): string {
  if (k.side === "player") {
    return k.result === "goal" ? "BUT !" : k.result === "saved" ? "Arrêté par le gardien…" : "À côté !";
  }
  return k.result === "goal" ? "Il marque…" : k.result === "saved" ? "ARRÊT DE TON GARDIEN !" : "Il rate le cadre !";
}
