import { describe, expect, it } from "vitest";
import {
  availabilityLabel,
  duplicatesValue,
  formatCountdown,
  formatProbability,
  normalizeOdds,
  parseAvailability,
} from "@/lib/boosters";

describe("boosters", () => {
  it("lit la disponibilité renvoyée par la RPC", () => {
    expect(parseAvailability({ available: true })).toEqual({ available: true });
    expect(parseAvailability({ available: false, reason: "cooldown", next_at: "2026-11-12T10:00:00Z" })).toEqual({
      available: false,
      reason: "cooldown",
      nextAt: "2026-11-12T10:00:00Z",
    });
    expect(parseAvailability({ available: false, reason: "sold_out" })).toEqual({ available: false, reason: "sold_out" });
    expect(parseAvailability(null)).toEqual({ available: false, reason: "inactive" });
  });

  it("donne un libellé à chaque indisponibilité", () => {
    expect(availabilityLabel({ available: true })).toBeNull();
    expect(availabilityLabel({ available: false, reason: "sold_out" })).toBe("Épuisé");
    expect(availabilityLabel({ available: false, reason: "cooldown", nextAt: "" })).toBe("En recharge");
  });

  it("complète et ordonne les probabilités", () => {
    const odds = normalizeOdds([
      { rarity: "rare", probability: "26.00" },
      { rarity: "commune", probability: 74 },
    ]);
    expect(odds.map((o) => o.rarity)).toEqual(["commune", "rare", "epique", "legendaire", "iconique", "speciale"]);
    expect(odds[1]!.probability).toBe(26);
    expect(odds[5]!.probability).toBe(0);
  });

  it("formate les probabilités en français", () => {
    expect(formatProbability(0.25)).toBe("0,25 %");
    expect(formatProbability(62)).toBe("62 %");
    expect(formatProbability(0)).toBe("—");
  });

  it("calcule la valeur de revente des doublons", () => {
    expect(duplicatesValue(["commune", "commune", "rare"], { commune: 10, rare: 30 })).toBe(50);
    expect(duplicatesValue(["speciale"], {})).toBe(0);
  });

  it("formate le compte à rebours", () => {
    expect(formatCountdown(2 * 3600_000 + 5 * 60_000)).toBe("2 h 05");
    expect(formatCountdown(12 * 60_000 + 3_000)).toBe("12 min 03");
    expect(formatCountdown(45_000)).toBe("45 s");
    expect(formatCountdown(-5)).toBe("0 s");
  });
});
