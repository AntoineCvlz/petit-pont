import { describe, expect, it } from "vitest";
import { admin, coins, createPlayer, type TestPlayer } from "./helpers";

async function mint(p: TestPlayer, rarity: "commune" | "rare" = "commune"): Promise<string> {
  const { data: tpl } = await admin.from("card_templates").select("id").eq("rarity", rarity).order("id").limit(1).single();
  const { data, error } = await admin.rpc("_mint_card", { p_template: tpl!.id, p_owner: p.id, p_via: "test" });
  if (error) throw error;
  return data as string;
}

async function list(p: TestPlayer, instanceId: string, price: number): Promise<string> {
  const { data, error } = await p.client.rpc("create_listing", { p_instance_id: instanceId, p_price: price });
  if (error) throw error;
  return data as string;
}

async function grant(p: TestPlayer, amount: number) {
  const { error } = await admin.rpc("_apply_coins", { p_user: p.id, p_amount: amount, p_type: "admin_adjustment", p_description: "test" });
  if (error) throw error;
}

describe("marché : concurrence entre joueurs", () => {
  it("5 acheteurs cliquent en même temps : un seul gagne, les autres ne paient rien", async () => {
    const seller = await createPlayer("Vend");
    const buyers = await Promise.all(Array.from({ length: 5 }, (_, i) => createPlayer(`Ach${i}`)));
    const listing = await list(seller, await mint(seller), 300);

    const results = await Promise.all(buyers.map((b) => b.client.rpc("buy_listing", { p_listing_id: listing })));
    const winners = results.flatMap((r, i) => (r.error ? [] : [buyers[i]!]));
    expect(winners).toHaveLength(1);
    expect(results.filter((r) => r.error).every((r) => r.error!.message.includes("Trop tard"))).toBe(true);

    const balances = await Promise.all(buyers.map((b) => coins(b.id)));
    expect(balances.filter((c) => c === 700)).toHaveLength(1); // 1000 - 300
    expect(balances.filter((c) => c === 1000)).toHaveLength(4);
    expect(await coins(seller.id)).toBe(1000 + 300 - 15);

    const { data: inst } = await admin.from("card_instances").select("owner_id, is_locked").eq("id", (await admin.from("market_listings").select("instance_id").eq("id", listing).single()).data!.instance_id!).single();
    expect(inst!.owner_id).toBe(winners[0]!.id);
    expect(inst!.is_locked).toBe(false);
  });

  it("le vendeur retire pendant qu'on achète : une seule des deux actions passe, état cohérent", async () => {
    for (let round = 0; round < 3; round++) {
      const seller = await createPlayer("Retire");
      const buyer = await createPlayer("Rapide");
      const instance = await mint(seller);
      const listing = await list(seller, instance, 200);

      const [buy, cancel] = await Promise.all([
        buyer.client.rpc("buy_listing", { p_listing_id: listing }),
        seller.client.rpc("cancel_listing", { p_listing_id: listing }),
      ]);
      expect([buy.error, cancel.error].filter((e) => e === null)).toHaveLength(1);

      const { data: inst } = await admin.from("card_instances").select("owner_id, is_locked").eq("id", instance).single();
      expect(inst!.is_locked).toBe(false);
      expect(inst!.owner_id).toBe(buy.error ? seller.id : buyer.id);
      expect(await coins(buyer.id)).toBe(buy.error ? 1000 : 800);
    }
  });

  it("achats croisés simultanés (A achète à B, B achète à A) : pas d'interblocage", async () => {
    const [a, b] = await Promise.all([createPlayer("CroixA"), createPlayer("CroixB")]);
    await Promise.all([grant(a, 5000), grant(b, 5000)]);
    const aListings: string[] = [];
    const bListings: string[] = [];
    for (let i = 0; i < 5; i++) {
      aListings.push(await list(a, await mint(a), 100));
      bListings.push(await list(b, await mint(b), 100));
    }
    const results = await Promise.all([
      ...bListings.map((id) => a.client.rpc("buy_listing", { p_listing_id: id })),
      ...aListings.map((id) => b.client.rpc("buy_listing", { p_listing_id: id })),
    ]);
    expect(results.map((r) => r.error?.message ?? null).filter(Boolean)).toEqual([]);
    // Chacun a payé 5 × 100 et encaissé 5 × 95
    expect(await coins(a.id)).toBe(6000 - 500 + 475);
    expect(await coins(b.id)).toBe(6000 - 500 + 475);
  });

  it("le journal des pièces reste cohérent", async () => {
    const { data } = await admin.from("coin_balance_audit").select("username").eq("is_consistent", false);
    expect(data).toEqual([]);
  });
});

describe("marché : temps réel", () => {
  it("C voit l'annonce passer à « vendue » quand B l'achète à A", async () => {
    const [a, b, c] = await Promise.all([createPlayer("RtVend"), createPlayer("RtAch"), createPlayer("RtObs")]);
    const { data: session } = await c.client.auth.getSession();
    c.client.realtime.setAuth(session.session!.access_token);

    const seen = new Map<string, string>();
    await new Promise<void>((resolve) => {
      c.client
        .channel("test-market")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_listings" }, (p) => {
          const row = p.new as { id: string; status: string };
          seen.set(row.id, row.status);
        })
        .subscribe((s) => s === "SUBSCRIBED" && resolve());
    });

    // Démarrage à froid de Realtime : on réessaie avec une nouvelle annonce si rien n'arrive
    let listing = "";
    for (let attempt = 0; attempt < 3 && !seen.has(listing); attempt++) {
      listing = await list(a, await mint(a), 50);
      const { error } = await b.client.rpc("buy_listing", { p_listing_id: listing });
      if (error) throw error;
      for (let i = 0; i < 30 && !seen.has(listing); i++) await new Promise((r) => setTimeout(r, 100));
    }
    await c.client.removeAllChannels();
    expect(seen.get(listing)).toBe("sold");
  });
});
