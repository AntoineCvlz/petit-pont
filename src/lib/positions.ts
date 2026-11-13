/** Postes précis (codes du catalogue importé) → abréviations et libellés français. */
export const DETAIL_POSITIONS: Record<string, { short: string; label: string }> = {
  GK: { short: "GB", label: "Gardien" },
  CB: { short: "DC", label: "Défenseur central" },
  LB: { short: "DG", label: "Latéral gauche" },
  RB: { short: "DD", label: "Latéral droit" },
  LWB: { short: "PG", label: "Piston gauche" },
  RWB: { short: "PD", label: "Piston droit" },
  CDM: { short: "MDC", label: "Milieu défensif" },
  CM: { short: "MC", label: "Milieu central" },
  CAM: { short: "MOC", label: "Milieu offensif" },
  LM: { short: "MG", label: "Milieu gauche" },
  RM: { short: "MD", label: "Milieu droit" },
  LW: { short: "AG", label: "Ailier gauche" },
  RW: { short: "AD", label: "Ailier droit" },
  CF: { short: "AT", label: "Attaquant de soutien" },
  ST: { short: "BU", label: "Buteur" },
};

export function positionShort(detail: string | null | undefined, fallback: string): string {
  return (detail && DETAIL_POSITIONS[detail]?.short) || fallback;
}

/** Statistiques affichées, dans l'ordre (joueurs de champ / gardiens). */
export const OUTFIELD_STATS = [
  ["pac", "VIT", "Vitesse"],
  ["sho", "TIR", "Tir"],
  ["pas", "PAS", "Passe"],
  ["dri", "DRI", "Dribble"],
  ["def", "DÉF", "Défense"],
  ["phy", "PHY", "Physique"],
] as const;

export const KEEPER_STATS = [
  ["div", "PLO", "Plongeon"],
  ["han", "MAI", "Jeu à la main"],
  ["kic", "DÉG", "Dégagement"],
  ["ref", "RÉF", "Réflexes"],
  ["spd", "VIT", "Vitesse"],
  ["pos", "PLA", "Placement"],
] as const;

export function statRows(stats: Record<string, number> | null): { key: string; short: string; label: string; value: number }[] {
  if (!stats) return [];
  const list = "div" in stats ? KEEPER_STATS : OUTFIELD_STATS;
  return list
    .filter(([k]) => typeof stats[k] === "number")
    .map(([key, short, label]) => ({ key, short, label, value: stats[key]! }));
}
