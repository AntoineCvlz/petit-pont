import { describe, expect, it } from "vitest";
import { admin, coins, createPlayer, type TestPlayer } from "./helpers";

async function mint(p: TestPlayer): Promise<string> {
  const { data: tpl } = await admin.from("card_templates").select("id").eq("rarity", "rare").order("id").limit(1).single();
  const { data, error } = await admin.rpc("_mint_card", { p_template: tpl!.id, p_owner: p.id, p_via: "test" });
  if (error) throw error;
  return data as string;
}

async function propose(from: TestPlayer, to: TestPlayer, offered: string[], requested: string[], coinsFrom = 0, coinsTo = 0) {
  const { data, error } = await from.client.rpc("propose_trade", {
    p_recipient: to.id,
    p_offered: offered,
    p_requested: requested,
    p_proposer_coins: coinsFrom,
    p_recipient_coins: coinsTo,
  });
  if (error) throw error;
  return data as string;
}

const owner = async (id: string) => (await admin.from("card_instances").select("owner_id, is_locked").eq("id", id).single()).data!;

describe("échanges : concurrence", () => {
  it("5 acceptations simultanées du même échange → un seul transfert", async () => {
    const [a, b] = await Promise.all([createPlayer("DblA"), createPlayer("DblB")]);
    const [x, y] = await Promise.all([mint(a), mint(b)]);
    const trade = await propose(a, b, [x], [y], 100, 0);
    const results = await Promise.all(Array.from({ length: 5 }, () => b.client.rpc("accept_trade", { p_trade_id: trade })));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect((await owner(x)).owner_id).toBe(b.id);
    expect((await owner(y)).owner_id).toBe(a.id);
    expect(await coins(a.id)).toBe(900);
    expect(await coins(b.id)).toBe(1100);
  });

  it("deux propositions pour la même carte acceptées en même temps → une seule passe, l'autre devient caduque", async () => {
    const [a, b, c] = await Promise.all([createPlayer("CarteA"), createPlayer("OffreB"), createPlayer("OffreC")]);
    const [x, bCard, cCard] = await Promise.all([mint(a), mint(b), mint(c)]);
    const fromB = await propose(b, a, [bCard], [x]);
    const fromC = await propose(c, a, [cCard], [x]);

    const [rb, rc] = await Promise.all([
      a.client.rpc("accept_trade", { p_trade_id: fromB }),
      a.client.rpc("accept_trade", { p_trade_id: fromC }),
    ]);
    expect([rb.error, rc.error].filter((e) => e === null)).toHaveLength(1);
    const winner = rb.error ? c : b;
    expect((await owner(x)).owner_id).toBe(winner.id);

    const { data: trades } = await admin.from("trades").select("id, status").in("id", [fromB, fromC]);
    const statuses = trades!.map((t) => t.status).sort();
    expect(statuses).toEqual(["accepted", "cancelled"]);
  });

  it("A accepte un échange pendant qu'il met la même carte en vente → une seule action passe", async () => {
    for (let round = 0; round < 3; round++) {
      const [a, b] = await Promise.all([createPlayer("VendEch"), createPlayer("Demande")]);
      const [x, y] = await Promise.all([mint(a), mint(b)]);
      const trade = await propose(b, a, [y], [x]);
      const [acc, list] = await Promise.all([
        a.client.rpc("accept_trade", { p_trade_id: trade }),
        a.client.rpc("create_listing", { p_instance_id: x, p_price: 100 }),
      ]);
      expect([acc.error, list.error].filter((e) => e === null)).toHaveLength(1);
      const state = await owner(x);
      if (!acc.error) {
        expect(state.owner_id).toBe(b.id);
        expect(state.is_locked).toBe(false);
      } else {
        expect(state.owner_id).toBe(a.id);
        expect(state.is_locked).toBe(true);
      }
    }
  });

  it("le destinataire accepte pendant que le proposant annule → une seule action passe", async () => {
    for (let round = 0; round < 3; round++) {
      const [a, b] = await Promise.all([createPlayer("Annule"), createPlayer("Accepte")]);
      const [x, y] = await Promise.all([mint(a), mint(b)]);
      const trade = await propose(a, b, [x], [y]);
      const [acc, cancel] = await Promise.all([
        b.client.rpc("accept_trade", { p_trade_id: trade }),
        a.client.rpc("cancel_trade", { p_trade_id: trade }),
      ]);
      expect([acc.error, cancel.error].filter((e) => e === null)).toHaveLength(1);
      expect((await owner(x)).owner_id).toBe(acc.error ? a.id : b.id);
    }
  });

  it("le journal des pièces reste cohérent", async () => {
    const { data } = await admin.from("coin_balance_audit").select("username").eq("is_consistent", false);
    expect(data).toEqual([]);
  });
});

describe("échanges : temps réel", () => {
  it("le proposant reçoit l'acceptation en direct", async () => {
    const [a, b] = await Promise.all([createPlayer("RtProp"), createPlayer("RtDest")]);
    const { data: session } = await a.client.auth.getSession();
    a.client.realtime.setAuth(session.session!.access_token);

    const seen = new Map<string, string>();
    await new Promise<void>((resolve) => {
      a.client
        .channel("test-trades")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trades" }, (p) => {
          const row = p.new as { id: string; status: string };
          seen.set(row.id, row.status);
        })
        .subscribe((s) => s === "SUBSCRIBED" && resolve());
    });

    let trade = "";
    for (let attempt = 0; attempt < 3 && !seen.has(trade); attempt++) {
      const [x, y] = await Promise.all([mint(a), mint(b)]);
      trade = await propose(a, b, [x], [y]);
      const { error } = await b.client.rpc("accept_trade", { p_trade_id: trade });
      if (error) throw error;
      for (let i = 0; i < 30 && !seen.has(trade); i++) await new Promise((r) => setTimeout(r, 100));
    }
    await a.client.removeAllChannels();
    expect(seen.get(trade)).toBe("accepted");
  });
});
