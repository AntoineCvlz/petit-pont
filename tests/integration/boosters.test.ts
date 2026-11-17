import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, boosterId, coins, createPlayer, type TestPlayer } from "./helpers";

/**
 * Concurrence réelle : chaque appel RPC est une requête HTTP distincte,
 * donc une transaction Postgres distincte exécutée en parallèle.
 */
describe("open_booster en parallèle", () => {
  let free: number;
  let standard: number;
  let limited: number;
  let initialStock: number;

  beforeAll(async () => {
    free = await boosterId("gratuit");
    standard = await boosterId("standard");
    limited = await boosterId("coupe-des-etoiles");
    const { data } = await admin.from("boosters").select("stock_remaining").eq("id", limited).single();
    initialStock = data!.stock_remaining!;
    // Édition limitée retirée de la vente : réactivée le temps du test de concurrence sur le stock
    await admin.from("boosters").update({ is_active: true }).eq("id", limited);
  });

  afterAll(async () => {
    await admin.from("boosters").update({ stock_remaining: initialStock, is_active: false }).eq("id", limited);
  });

  it("réserve de 10 boosters gratuits : 10 ouvertures sur 14 clics simultanés", async () => {
    const p = await createPlayer("Gratuit");
    const results = await Promise.all(Array.from({ length: 14 }, () => p.client.rpc("open_booster", { p_booster_id: free })));
    const ok = results.filter((r) => !r.error);
    expect(results.filter((r) => r.error).map((r) => r.error!.message)).toEqual(Array(4).fill(expect.stringContaining("pas encore prêt")));
    expect(ok).toHaveLength(10);
    expect(results.filter((r) => r.error).every((r) => r.error!.message.includes("pas encore prêt"))).toBe(true);
  }, 30_000);

  it("le solde ne passe jamais sous zéro : 1 000 pièces = 4 boosters Argent à 250, pas un de plus", async () => {
    const p = await createPlayer("Solde");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => p.client.rpc("open_booster", { p_booster_id: standard })),
    );
    expect(results.filter((r) => !r.error)).toHaveLength(4);
    expect(await coins(p.id)).toBe(0);

    const { count } = await admin.from("card_instances").select("id", { count: "exact", head: true }).eq("owner_id", p.id);
    expect(count).toBe(20);
  });

  it("stock limité : deux joueurs se disputent les 3 derniers boosters", async () => {
    const [a, b] = await Promise.all([createPlayer("StockA"), createPlayer("StockB")]);
    // 5 000 pièces de plus chacun, pour que seul le stock limite les achats
    await Promise.all([grantCoins(a, 5000), grantCoins(b, 5000)]);
    await admin.from("boosters").update({ stock_remaining: 3 }).eq("id", limited);

    const calls = [a, b, a, b, a, b, a, b].map((p) => p.client.rpc("open_booster", { p_booster_id: limited }));
    const results = await Promise.all(calls);
    const ok = results.filter((r) => !r.error);
    expect(ok).toHaveLength(3);
    expect(results.filter((r) => r.error).every((r) => r.error!.message.includes("épuisé"))).toBe(true);

    const { data } = await admin.from("boosters").select("stock_remaining").eq("id", limited).single();
    expect(data!.stock_remaining).toBe(0);

    const { count } = await admin
      .from("booster_openings")
      .select("id", { count: "exact", head: true })
      .eq("booster_id", limited)
      .in("user_id", [a.id, b.id]);
    expect(count).toBe(3);
  });

  it("le journal des pièces reste cohérent", async () => {
    const { data, error } = await admin.from("coin_balance_audit").select("is_consistent").eq("is_consistent", false);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("sell_duplicates en parallèle", () => {
  it("un même doublon ne peut pas être revendu deux fois", async () => {
    const p = await createPlayer("Revente");
    const standard = await boosterId("standard");
    // Ouvre des boosters jusqu'à obtenir un doublon
    let dup: string | null = null;
    // 1 000 pièces de départ : 4 boosters Argent au plus
    for (let i = 0; i < 4 && !dup; i++) {
      const { data, error } = await p.client.rpc("open_booster", { p_booster_id: standard });
      if (error) throw error;
      const cards = (data as { cards: { instance_id: string; is_new: boolean }[] }).cards;
      dup = cards.find((c) => !c.is_new)?.instance_id ?? null;
    }
    if (!dup) return; // tirage sans doublon (très improbable) : rien à vérifier

    const before = await coins(p.id);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => p.client.rpc("sell_duplicates", { p_instance_ids: [dup!] })),
    );
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    const credited = (await coins(p.id)) - before;
    expect(credited).toBe((results.find((r) => !r.error)!.data as { coins: number }).coins);
  });
});

async function grantCoins(p: TestPlayer, amount: number) {
  // Passe par la base avec la clé secrète : pas d'API publique pour créditer des pièces.
  const { error } = await admin.rpc("_apply_coins", {
    p_user: p.id,
    p_amount: amount,
    p_type: "admin_adjustment",
    p_description: "Test d'intégration",
  });
  if (error) throw error;
}
