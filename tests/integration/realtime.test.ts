import { describe, expect, it } from "vitest";
import { admin, boosterId, createPlayer } from "./helpers";

describe("Realtime : stock des boosters limités", () => {
  it("B voit le stock baisser en direct quand A achète", async () => {
    const limited = await boosterId("coupe-des-etoiles");
    const [a, b] = await Promise.all([createPlayer("LiveA"), createPlayer("LiveB")]);
    await admin.rpc("_apply_coins", { p_user: a.id, p_amount: 5000, p_type: "admin_adjustment", p_description: "test" });

    // Le client Realtime doit porter le jeton de B (RLS appliquée aux événements)
    const { data: session } = await b.client.auth.getSession();
    b.client.realtime.setAuth(session.session!.access_token);

    const events: number[] = [];
    const subscribed = new Promise<void>((resolve) => {
      b.client
        .channel(`test-stock-${limited}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "boosters", filter: `id=eq.${limited}` }, (p) => {
          events.push((p.new as { stock_remaining: number }).stock_remaining);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
    });
    await subscribed;

    // Le tout premier abonnement après un redémarrage de Realtime met quelques secondes
    // à recevoir le flux : on rachète tant qu'aucun événement n'est arrivé (3 tentatives max).
    let expected: number | null = null;
    for (let attempt = 0; attempt < 3 && events.length === 0; attempt++) {
      const { error } = await a.client.rpc("open_booster", { p_booster_id: limited });
      if (error) throw error;
      const { data } = await admin.from("boosters").select("stock_remaining").eq("id", limited).single();
      expected = data!.stock_remaining;
      for (let i = 0; i < 30 && events.length === 0; i++) await new Promise((r) => setTimeout(r, 100));
    }
    await b.client.removeAllChannels();

    expect(events.length).toBeGreaterThan(0);
    expect(events.at(-1)).toBe(expected);
  });
});
