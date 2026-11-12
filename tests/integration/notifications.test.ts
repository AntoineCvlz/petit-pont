import { describe, expect, it } from "vitest";
import { admin, createPlayer, type TestPlayer } from "./helpers";

async function listen(p: TestPlayer, sink: { title: string }[]) {
  const { data: session } = await p.client.auth.getSession();
  p.client.realtime.setAuth(session.session!.access_token);
  await new Promise<void>((resolve) => {
    p.client
      .channel(`notif-${p.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${p.id}` }, (e) => {
        sink.push(e.new as { title: string });
      })
      // Abonnement sans filtre : vérifie que la RLS ne laisse rien fuiter
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (e) => {
        if ((e.new as { user_id: string }).user_id !== p.id) sink.push({ title: "FUITE" });
      })
      .subscribe((s) => s === "SUBSCRIBED" && resolve());
  });
}

describe("notifications en temps réel", () => {
  it("le vendeur est notifié instantanément, un tiers ne reçoit rien", async () => {
    const [seller, buyer, other] = await Promise.all([createPlayer("NotVend"), createPlayer("NotAch"), createPlayer("NotTiers")]);
    const sellerSeen: { title: string }[] = [];
    const otherSeen: { title: string }[] = [];
    await Promise.all([listen(seller, sellerSeen), listen(other, otherSeen)]);
    const { data: tpl } = await admin.from("card_templates").select("id").eq("rarity", "commune").limit(1).single();

    for (let attempt = 0; attempt < 3 && sellerSeen.length === 0; attempt++) {
      const { data: inst } = await admin.rpc("_mint_card", { p_template: tpl!.id, p_owner: seller.id, p_via: "test" });
      const { data: listing, error } = await seller.client.rpc("create_listing", { p_instance_id: inst as string, p_price: 10 });
      if (error) throw error;
      const { error: buyError } = await buyer.client.rpc("buy_listing", { p_listing_id: listing as string });
      if (buyError) throw buyError;
      for (let i = 0; i < 30 && sellerSeen.length === 0; i++) await new Promise((r) => setTimeout(r, 100));
    }
    await new Promise((r) => setTimeout(r, 500));
    await Promise.all([seller.client.removeAllChannels(), other.client.removeAllChannels()]);

    expect(sellerSeen.some((n) => n.title === "Carte vendue !")).toBe(true);
    expect(sellerSeen.some((n) => n.title === "FUITE")).toBe(false);
    expect(otherSeen).toEqual([]);
  });
});
