import { describe, expect, it } from "vitest";
import { marketFee, normalizeSearch, parseMarketQuery, sellerNet, suggestedPrice } from "@/lib/market";

describe("marché", () => {
  it("lit les paramètres d'URL et ignore les valeurs inconnues", () => {
    expect(parseMarketQuery({ onglet: "ventes", rarete: "rare", prix: "100-500", tri: "prix-asc", page: "3" })).toMatchObject({
      tab: "ventes", rarity: "rare", price: "100-500", sort: "prix-asc", page: 3,
    });
    const bad = parseMarketQuery({ onglet: "admin", prix: "gratuit", tri: "x", page: "-4" });
    expect(bad).toMatchObject({ tab: "annonces", price: null, sort: "recent", page: 1 });
  });

  it("normalise la recherche et neutralise les caractères spéciaux", () => {
    expect(normalizeSearch("Mbappé")).toBe("mbappe");
    expect(normalizeSearch("  Lucas   Chevalier ")).toBe("lucas chevalier");
    expect(normalizeSearch("Vinícius Jr.")).toBe("vinicius jr");
    expect(normalizeSearch("a%,(b)*_")).toBe("a b");
  });

  it("calcule la commission comme le serveur (arrondi inférieur)", () => {
    expect(marketFee(2500, 5)).toBe(125);
    expect(marketFee(19, 5)).toBe(0);
    expect(marketFee(30, 5)).toBe(1);
    expect(sellerNet(300, 5)).toBe(285);
  });

  it("propose un prix", () => {
    expect(suggestedPrice(420, 30)).toBe(420);
    expect(suggestedPrice(null, 30)).toBe(90);
    expect(suggestedPrice(null, 0)).toBe(1);
  });
});
