import { describe, expect, it } from "vitest";
import { kickMessage, kickPath, kickSlots, nextShooterIndex, nextSide, type Kick } from "@/lib/penalty";

const k = (n: number, result: Kick["result"]): Kick => ({
  n,
  side: n % 2 === 0 ? "player" : "opponent",
  shooter: 1,
  direction: "gauche",
  dive: "droite",
  result,
});

describe("séance de tirs au but", () => {
  it("alterne les tireurs, le joueur commence", () => {
    expect(nextSide([])).toBe("player");
    expect(nextSide([k(0, "goal")])).toBe("opponent");
    expect(nextSide([k(0, "goal"), k(1, "saved")])).toBe("player");
  });

  it("fait tourner les 5 tireurs", () => {
    const ten = Array.from({ length: 10 }, (_, i) => k(i, "goal"));
    expect(nextShooterIndex(ten, "player")).toBe(0);
    expect(nextShooterIndex(ten.slice(0, 7), "player")).toBe(4);
    expect(nextShooterIndex(ten.slice(0, 7), "opponent")).toBe(3);
  });

  it("affiche 5 cases, puis les tirs de mort subite", () => {
    expect(kickSlots([k(0, "goal"), k(1, "missed")], "player")).toEqual(["goal", null, null, null, null]);
    const sudden = Array.from({ length: 12 }, (_, i) => k(i, i === 11 ? "saved" : "goal"));
    expect(kickSlots(sudden, "player")).toHaveLength(6);
    expect(kickSlots(sudden, "opponent").at(-1)).toBe("saved");
  });

  it("formule le résultat selon le camp", () => {
    expect(kickMessage({ side: "player", result: "goal" })).toBe("BUT !");
    expect(kickMessage({ side: "opponent", result: "saved" })).toBe("ARRÊT DE TON GARDIEN !");
    expect(kickMessage({ side: "player", result: "missed" })).toBe("À côté !");
    // Gardien du bon côté mais but : message explicite (plus d'impression de bug)
    expect(kickMessage({ side: "opponent", result: "goal", direction: "gauche", dive: "gauche" })).toBe(
      "Bon côté… mais en pleine lucarne",
    );
    expect(kickMessage({ side: "opponent", result: "goal", direction: "gauche", dive: "droite" })).toBe(
      "Il marque, ton gardien part du mauvais côté…",
    );
    // Centre : jamais de « lucarne »
    expect(kickMessage({ side: "player", result: "goal", direction: "centre", dive: "centre" })).toBe(
      "BUT ! En force, au-dessus du gardien",
    );
    expect(kickMessage({ side: "player", result: "goal", direction: "centre", dive: "gauche" })).toBe(
      "BUT ! Plein centre, le gardien a plongé",
    );
    expect(kickMessage({ side: "player", result: "missed", direction: "centre", dive: "droite" })).toBe("Au-dessus de la barre !");
  });

  it("trajectoire cohérente avec le résultat", () => {
    const corner = kickPath({ direction: "droite", dive: "droite", result: "goal" });
    expect(corner.net).toBe(true);
    expect(corner.ball.y).toBeLessThan(15); // lucarne
    expect(corner.ball.x).toBeGreaterThan(73);
    const over = kickPath({ direction: "centre", dive: "gauche", result: "missed" });
    expect(over.ball.x).toBe(50);
    expect(over.ball.y).toBeLessThan(8); // au-dessus de la barre, pas sur le côté
    const save = kickPath({ direction: "gauche", dive: "gauche", result: "saved" });
    expect(save.rebound).not.toBeNull();
    expect(save.keeper.rotate).toBeLessThan(0);
  });
});
