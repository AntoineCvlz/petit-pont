import { describe, expect, it } from "vitest";
import { expiresIn, parseTradeTab, tradeDraftError } from "@/lib/trades";

const base = { offered: ["a"], requested: ["b"], giveCoins: 0, askCoins: 0, message: "" };

describe("échanges", () => {
  it("lit l'onglet depuis l'URL", () => {
    expect(parseTradeTab("envoyes")).toBe("envoyes");
    expect(parseTradeTab("pirate")).toBe("recus");
    expect(parseTradeTab(undefined)).toBe("recus");
  });

  it("valide un brouillon d'échange", () => {
    expect(tradeDraftError(base, 1000)).toBeNull();
    expect(tradeDraftError({ ...base, offered: [], requested: [] }, 1000)).toMatch(/au moins une carte/);
    expect(tradeDraftError({ ...base, offered: Array.from({ length: 11 }, (_, i) => String(i)) }, 1000)).toMatch(/Maximum 10/);
    expect(tradeDraftError({ ...base, giveCoins: 1500 }, 1000)).toMatch(/pas assez/);
    expect(tradeDraftError({ ...base, askCoins: -5 }, 1000)).toMatch(/invalide/);
    expect(tradeDraftError({ ...base, askCoins: 2.5 }, 1000)).toMatch(/invalide/);
    expect(tradeDraftError({ ...base, message: "x".repeat(281) }, 1000)).toMatch(/trop long/);
  });

  it("affiche le temps restant", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    expect(expiresIn("2026-11-19T12:00:00Z", now)).toBe("expire dans 7 jours");
    expect(expiresIn("2026-11-12T17:30:00Z", now)).toBe("expire dans 5 h");
    expect(expiresIn("2026-11-12T12:20:00Z", now)).toBe("expire dans 20 min");
    expect(expiresIn("2026-11-12T11:00:00Z", now)).toBe("expiré");
  });
});
