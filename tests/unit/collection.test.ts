import { describe, expect, it } from "vitest";
import { applyCollectionQuery, filterOptions, normalizeText, parseCollectionQuery, type CollectionItem } from "@/lib/collection";
import type { CardTemplateView } from "@/lib/data/cards";
import type { Rarity } from "@/lib/rarity";

function item(over: Partial<CardTemplateView> & { copies?: number; at?: string }): CollectionItem {
  const template: CardTemplateView = {
    id: over.id ?? 1,
    playerSlug: "x",
    playerName: over.playerName ?? "Joueur",
    position: over.position ?? "ATT",
    nation: over.nation ?? { code: "FRA", name: "France", flagColors: [], flagLayout: "v" },
    club: over.club === undefined ? { code: "PSG", name: "Paris Saint-Germain", shortName: "PSG", colorPrimary: "", colorSecondary: "", crestUrl: null } : over.club,
    season: "Saison 2026",
    edition: over.edition ?? "Base",
    rarity: (over.rarity ?? "commune") as Rarity,
    rating: over.rating ?? 80,
    collectionNumber: over.collectionNumber ?? 1,
    maxSupply: null,
    mintedCount: 0,
    imageUrl: null,
  };
  return { template, copies: over.copies ?? 1, lastObtainedAt: over.at ?? "2026-11-01T00:00:00Z" };
}

const items = [
  item({ id: 1, playerName: "Kylian Mbappé", rarity: "legendaire", rating: 91, collectionNumber: 150, club: { code: "RMA", name: "Real Madrid", shortName: "RMA", colorPrimary: "", colorSecondary: "", crestUrl: null }, at: "2026-11-10T00:00:00Z" }),
  item({ id: 2, playerName: "Ousmane Dembélé", rarity: "legendaire", rating: 90, collectionNumber: 149, copies: 3, at: "2026-11-05T00:00:00Z" }),
  item({ id: 3, playerName: "Vitinha", rarity: "epique", rating: 88, collectionNumber: 120, position: "MIL", nation: { code: "POR", name: "Portugal", flagColors: [], flagLayout: "v" } }),
  item({ id: 4, playerName: "Lucas Chevalier", rarity: "commune", rating: 80, collectionNumber: 10, position: "GB", copies: 2, at: "2026-11-11T00:00:00Z" }),
];

describe("filtres de collection", () => {
  it("lit l'URL et ignore les valeurs inconnues", () => {
    expect(parseCollectionQuery({ rarete: "epique", poste: "MIL", tri: "note", doublons: "1", q: "  mbap " })).toEqual({
      q: "mbap", rarity: "epique", club: null, nation: null, position: "MIL", sort: "note", duplicatesOnly: true,
    });
    const bad = parseCollectionQuery({ rarete: "divine", poste: "X", tri: "hack" });
    expect(bad.rarity).toBeNull();
    expect(bad.position).toBeNull();
    expect(bad.sort).toBe("rarete");
  });

  it("recherche sans tenir compte des accents", () => {
    expect(normalizeText("Dembélé")).toBe("dembele");
    const r = applyCollectionQuery(items, parseCollectionQuery({ q: "dembele" }));
    expect(r.map((i) => i.template.id)).toEqual([2]);
  });

  it("recherche aussi par club et nation", () => {
    expect(applyCollectionQuery(items, parseCollectionQuery({ q: "real" })).map((i) => i.template.id)).toEqual([1]);
    expect(applyCollectionQuery(items, parseCollectionQuery({ q: "portugal" })).map((i) => i.template.id)).toEqual([3]);
  });

  it("filtre par rareté, club, nation, poste et doublons", () => {
    const ids = (p: Record<string, string>) => applyCollectionQuery(items, parseCollectionQuery(p)).map((i) => i.template.id);
    expect(ids({ rarete: "legendaire" })).toEqual([1, 2]);
    expect(ids({ club: "PSG" })).toEqual([2, 3, 4]);
    expect(ids({ nation: "POR" })).toEqual([3]);
    expect(ids({ poste: "GB" })).toEqual([4]);
    expect(ids({ doublons: "1" })).toEqual([2, 4]);
  });

  it("trie selon le critère choisi", () => {
    const ids = (tri: string) => applyCollectionQuery(items, parseCollectionQuery({ tri })).map((i) => i.template.id);
    expect(ids("rarete")).toEqual([1, 2, 3, 4]);
    expect(ids("note")).toEqual([1, 2, 3, 4]);
    expect(ids("date")).toEqual([4, 1, 2, 3]);
    expect(ids("numero")).toEqual([4, 3, 2, 1]);
    expect(ids("nom")).toEqual([1, 4, 2, 3]);
  });

  it("propose uniquement les clubs et nations possédés", () => {
    const { clubs, nations } = filterOptions(items);
    expect(clubs.map((c) => c.value)).toEqual(["PSG", "RMA"]);
    expect(nations.map((n) => n.value)).toEqual(["FRA", "POR"]);
  });
});
