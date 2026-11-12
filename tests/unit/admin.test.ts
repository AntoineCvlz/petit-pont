import { describe, expect, it } from "vitest";
import { FormError, FormReader, isoToParisLocal, oddsError, oddsTotal, parisLocalToIso, parseCollectionNumbers, slugify } from "@/lib/admin";

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return new FormReader(f);
}

describe("administration", () => {
  it("lit et valide les champs", () => {
    const r = fd({ name: "  Zizou ", rating: "96", flag: "on", rarity: "rare", bad: "12.5" });
    expect(r.text("name")).toBe("Zizou");
    expect(r.int("rating", { min: 40, max: 99 })).toBe(96);
    expect(r.bool("flag")).toBe(true);
    expect(r.bool("absent")).toBe(false);
    expect(r.oneOf("rarity", ["commune", "rare"] as const)).toBe("rare");
    expect(() => r.int("bad")).toThrow(FormError);
    expect(() => r.int("rating", { max: 90 })).toThrow(FormError);
    expect(() => r.text("absent", { required: true })).toThrow(FormError);
    expect(() => r.oneOf("name", ["a"] as const)).toThrow(FormError);
  });

  it("génère un slug", () => {
    expect(slugify("Vinícius Júnior")).toBe("vinicius-junior");
    expect(slugify("  Coupe des Étoiles !")).toBe("coupe-des-etoiles");
  });

  it("lit une liste de numéros de collection", () => {
    expect(parseCollectionNumbers("12, 45 46\n47;48")).toEqual([12, 45, 46, 47, 48]);
    expect(() => parseCollectionNumbers("12, abc, -3")).toThrow(/abc, -3/);
  });

  it("vérifie que les probabilités totalisent 100 %", () => {
    expect(oddsTotal({ commune: 62, rare: 26, epique: 9, legendaire: 2.3, iconique: 0.6, speciale: 0.1 })).toBe(100);
    expect(oddsError({ commune: 62, rare: 26, epique: 9, legendaire: 2.3, iconique: 0.6, speciale: 0.1 })).toBeNull();
    expect(oddsError({ commune: 60 })).toMatch(/60 %/);
    expect(oddsError({ commune: 99.999, rare: 0.001 })).toMatch(/2 décimales/);
    expect(oddsError({ commune: -1, rare: 101 })).toMatch(/entre 0 et 100/);
  });

  it("convertit l'heure de Paris (été comme hiver)", () => {
    expect(parisLocalToIso("2026-01-15T18:30")).toBe("2026-01-15T17:30:00.000Z");
    expect(parisLocalToIso("2026-07-15T18:30")).toBe("2026-07-15T16:30:00.000Z");
    expect(isoToParisLocal("2026-07-15T16:30:00.000Z")).toBe("2026-07-15T18:30");
    expect(isoToParisLocal(null)).toBe("");
  });
});
