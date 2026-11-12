import { describe, expect, it } from "vitest";
import { COIN_TX_LABELS, isCoinTxType, previewBulkSale, previewFromSummary, summarizeDuplicates, type DuplicateCopy } from "@/lib/economy";

const prices = { commune: 10, rare: 30, epique: 80, legendaire: 250 };

describe("économie", () => {
  it("a un libellé pour chaque type de mouvement", () => {
    expect(COIN_TX_LABELS.daily_bonus).toBe("Bonus quotidien");
    expect(isCoinTxType("market_sale")).toBe(true);
    expect(isCoinTxType("hack")).toBe(false);
  });

  it("aperçu de revente : garde un exemplaire par carte et respecte le plafond", () => {
    const copies: DuplicateCopy[] = [
      { templateId: 1, serialNumber: 1, rarity: "commune", isLocked: false },
      { templateId: 1, serialNumber: 2, rarity: "commune", isLocked: false },
      { templateId: 1, serialNumber: 3, rarity: "commune", isLocked: false },
      { templateId: 2, serialNumber: 1, rarity: "legendaire", isLocked: false },
      { templateId: 2, serialNumber: 2, rarity: "legendaire", isLocked: false },
      { templateId: 3, serialNumber: 1, rarity: "rare", isLocked: true },
      { templateId: 3, serialNumber: 2, rarity: "rare", isLocked: false },
    ];
    expect(previewBulkSale(copies, "commune", prices)).toEqual({ count: 2, coins: 20 });
    // La rare verrouillée n'est pas comptée : il reste une seule libre, conservée
    expect(previewBulkSale(copies, "epique", prices)).toEqual({ count: 2, coins: 20 });
    expect(previewBulkSale(copies, "legendaire", prices)).toEqual({ count: 3, coins: 270 });
    // Le résumé envoyé au navigateur donne exactement le même aperçu
    const summary = summarizeDuplicates(copies);
    expect(summary).toEqual({ commune: 2, legendaire: 1 });
    for (const max of ["commune", "epique", "legendaire", "speciale"] as const) {
      expect(previewFromSummary(summary, max, prices)).toEqual(previewBulkSale(copies, max, prices));
    }
  });
});
