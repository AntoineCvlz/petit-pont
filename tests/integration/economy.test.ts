import { describe, expect, it } from "vitest";
import { admin, coins, createPlayer } from "./helpers";

describe("économie en parallèle", () => {
  it("bonus quotidien : 6 demandes simultanées → un seul versement", async () => {
    const p = await createPlayer("Bonus");
    const before = await coins(p.id);
    const results = await Promise.all(Array.from({ length: 6 }, () => p.client.rpc("claim_daily_bonus")));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect((await coins(p.id)) - before).toBe(100);
  });

  it("revente groupée : 4 demandes simultanées ne revendent chaque doublon qu'une fois", async () => {
    const p = await createPlayer("Lot");
    const { data: tpls } = await admin.from("card_templates").select("id").eq("rarity", "commune").order("id").limit(3);
    // 3 cartes × 4 exemplaires = 9 doublons à 10 pièces
    for (const t of tpls!) {
      for (let i = 0; i < 4; i++) await admin.rpc("_mint_card", { p_template: t.id, p_owner: p.id, p_via: "test" });
    }
    const before = await coins(p.id);
    const results = await Promise.all(
      Array.from({ length: 4 }, () => p.client.rpc("sell_all_duplicates", { p_max_rarity: "commune" })),
    );
    expect(results.every((r) => !r.error)).toBe(true);
    const sold = results.reduce((n, r) => n + (r.data as { sold: number }).sold, 0);
    expect(sold).toBe(9);
    expect((await coins(p.id)) - before).toBe(90);

    const { count } = await admin.from("card_instances").select("id", { count: "exact", head: true }).eq("owner_id", p.id);
    expect(count).toBe(3);
  });
});
