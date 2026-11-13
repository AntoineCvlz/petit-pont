import { describe, expect, it } from "vitest";
import { positionShort, statRows } from "@/lib/positions";

describe("positions précises", () => {
  it("traduit le poste précis en abréviation française, sinon garde le poste du jeu", () => {
    expect(positionShort("ST", "ATT")).toBe("BU");
    expect(positionShort("CDM", "MIL")).toBe("MDC");
    expect(positionShort(null, "DEF")).toBe("DEF");
    expect(positionShort("XYZ", "MIL")).toBe("MIL");
  });

  it("ordonne les statistiques des joueurs de champ et des gardiens", () => {
    expect(statRows({ pac: 96, sho: 91, pas: 80, dri: 92, def: 29, phy: 76 }).map((s) => s.short)).toEqual([
      "VIT",
      "TIR",
      "PAS",
      "DRI",
      "DÉF",
      "PHY",
    ]);
    const gk = statRows({ div: 87, han: 89, kic: 78, ref: 90, spd: 46, pos: 90 });
    expect(gk.map((s) => s.short)).toEqual(["PLO", "MAI", "DÉG", "RÉF", "VIT", "PLA"]);
    expect(gk[3]!.value).toBe(90);
    expect(statRows(null)).toEqual([]);
  });
});
