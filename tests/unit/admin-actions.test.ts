import { describe, expect, it } from "vitest";
import { describeAdminAction } from "@/lib/admin";

describe("describeAdminAction", () => {
  it("décrit les cadeaux avec accords et motif", () => {
    expect(describeAdminAction("give_boosters", { booster: "Booster Loge", count: 2, reason: "Concours" })).toBe(
      "2 packs « Booster Loge » offerts (« Concours »)",
    );
    expect(describeAdminAction("give_cards", { card: "Pelé (Holo, speciale)", count: 1 })).toBe(
      "1 exemplaire de Pelé (Holo, speciale) offert",
    );
  });

  it("signe les ajustements de pièces", () => {
    expect(describeAdminAction("adjust_coins", { amount: 500 })).toBe("+500 pièces");
    expect(describeAdminAction("adjust_coins", { amount: -200, reason: "Triche" })).toBe("-200 pièces (« Triche »)");
  });

  it("liste les cartes retirées", () => {
    expect(describeAdminAction("remove_cards", { cards: [{ card: "Mbappé (Base)", serial: 4 }] })).toBe(
      "Carte retirée : Mbappé (Base) #4",
    );
  });

  it("couvre réinitialisation, bannissement et action inconnue", () => {
    expect(describeAdminAction("reset_account", { cards_removed: 12, coins_before: 340 })).toBe(
      "Compte réinitialisé (12 cartes, 340 pièces avant)",
    );
    expect(describeAdminAction("ban", { reason: "Insultes" })).toBe("Banni (« Insultes »)");
    expect(describeAdminAction("unban", {})).toBe("Bannissement levé");
    expect(describeAdminAction("autre", {})).toBe("autre");
  });
});
