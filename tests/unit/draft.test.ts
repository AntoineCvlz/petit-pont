import { describe, expect, it } from "vitest";
import { draftChemistry, draftLinks, draftScore, linkStrength, type DraftFormation, type LinkIdentity } from "@/lib/draft";

const real = (nation: string): LinkIdentity => ({ club: "RMA", league: "LL", nation });
const barca = (nation: string): LinkIdentity => ({ club: "FCB", league: "LL", nation });
const arsenal = (nation: string): LinkIdentity => ({ club: "ARS", league: "PL", nation });

describe("linkStrength", () => {
  it("applique les règles vert / orange / rouge", () => {
    expect(linkStrength(real("FRA"), real("BRA"))).toBe(2); // même club
    expect(linkStrength(real("FRA"), barca("FRA"))).toBe(2); // même ligue + même nation
    expect(linkStrength(real("FRA"), barca("BRA"))).toBe(1); // même ligue
    expect(linkStrength(real("FRA"), arsenal("FRA"))).toBe(1); // même nation
    expect(linkStrength(real("BRA"), arsenal("ENG"))).toBe(0); // rien
  });

  it("ne relie pas deux joueurs sans club ni ligue", () => {
    expect(linkStrength({ club: null, league: null, nation: "FRA" }, { club: null, league: null, nation: "ESP" })).toBe(0);
  });
});

const mini: DraftFormation = {
  code: "t",
  name: "test",
  slots: [
    { key: "A", label: "A", pos: "GB", x: 50, y: 90 },
    { key: "B", label: "B", pos: "DEF", x: 30, y: 60 },
    { key: "C", label: "C", pos: "DEF", x: 70, y: 60 },
  ],
  links: [
    ["A", "B"],
    ["A", "C"],
    ["B", "C"],
  ],
};

describe("draftChemistry", () => {
  it("calcule le collectif de chaque joueur à partir de ses liens", () => {
    // A–B vert, A–C rouge, B–C orange
    const picks = { A: real("FRA"), B: real("BRA"), C: arsenal("BRA") };
    const { perSlot, total } = draftChemistry(mini, picks);
    expect(perSlot).toEqual({ A: 5, B: 8, C: 3 }); // A : (2+0)/2 → 5 ; B : (2+1)/2 → 7,5 → 8 ; C : (0+1)/2 → 2,5 → 3
    expect(total).toBe(16);
  });

  it("ignore les liens dont un poste est vide", () => {
    expect(draftLinks(mini, { A: real("FRA") }).every((l) => l.strength === null)).toBe(true);
    expect(draftChemistry(mini, { A: real("FRA") }).total).toBe(0);
  });

  it("plafonne le total à 100", () => {
    const big: DraftFormation = {
      ...mini,
      slots: Array.from({ length: 12 }, (_, i) => ({ key: `S${i}`, label: "S", pos: "MIL" as const, x: 0, y: 0 })),
      links: Array.from({ length: 11 }, (_, i) => [`S${i}`, `S${i + 1}`] as [string, string]),
    };
    const picks = Object.fromEntries(big.slots.map((s) => [s.key, real("FRA")]));
    expect(draftChemistry(big, picks).total).toBe(100);
  });
});

describe("draftScore", () => {
  it("ajoute le collectif / 20 à la note", () => {
    expect(draftScore(85.27, 100)).toBe(90.27);
    expect(draftScore(80, 0)).toBe(80);
    expect(draftScore(83.45, 37)).toBe(85.3);
  });
});
