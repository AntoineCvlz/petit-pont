import { describe, expect, it } from "vitest";
import { sbcChecks, sbcEligible, type SbcCard } from "@/lib/sbc";

const card = (o: Partial<SbcCard> = {}): SbcCard => ({ rating: 80, rarity: "commune", nation: "FRA", club: "PSG", league: "L1", ...o });

describe("défis d'équipe", () => {
  it("vérifie le nombre exact de cartes", () => {
    expect(sbcChecks({ count: 3 }, [card(), card()])).toEqual([{ label: "2/3 cartes", ok: false }]);
    expect(sbcChecks({ count: 2 }, [card(), card()])[0]!.ok).toBe(true);
  });

  it("exige la même ligue ou nation pour toutes les cartes", () => {
    const names = { leagues: { L1: "Ligue 1" }, nations: { FRA: "France" } };
    expect(sbcChecks({ league: "L1" }, [card(), card({ league: "PL" })], names)).toEqual([{ label: "Toutes de Ligue 1", ok: false }]);
    expect(sbcChecks({ nation: "FRA" }, [card(), card()], names)).toEqual([{ label: "Tous France", ok: true }]);
  });

  it("calcule note moyenne, raretés et nations", () => {
    const cards = [card({ rating: 90, rarity: "epique", nation: "BRA" }), card({ rating: 80, rarity: "legendaire" })];
    const [avg, rarity, nations] = sbcChecks(
      { min_avg_rating: 85, min_rarity: { rarity: "epique", count: 2 }, distinct_nations: 3 },
      cards,
    );
    expect(avg).toEqual({ label: "Note moyenne 85.0 / 85", ok: true });
    expect(rarity).toEqual({ label: "2/2 Épiques ou mieux", ok: true });
    expect(nations).toEqual({ label: "2/3 nations différentes", ok: false });
  });

  it("filtre les cartes éligibles", () => {
    expect(sbcEligible({ league: "L1" }, card())).toBe(true);
    expect(sbcEligible({ league: "PL" }, card())).toBe(false);
    expect(sbcEligible({ count: 5 }, card({ league: null }))).toBe(true);
  });
});
