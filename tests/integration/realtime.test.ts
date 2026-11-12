import { describe, expect, it } from "vitest";
import { admin, boosterId, createPlayer } from "./helpers";

describe("Realtime : stock des boosters limités", () => {
  it("B voit le stock baisser en direct quand A achète", async () => {
    const limited = await boosterId("coupe-des-etoiles");
    const [a, b] = await Promise.all([createPlayer("LiveA"), createPlayer("LiveB")]);
    await admin.rpc("_apply_coins", { p_user: a.id, p_amount: 2000, p_type: "admin_adjustment", p_description: "test" });
    const { data: before } = await admin.from("boosters").select("stock_remaining").eq("id", limited).single();

    // Le client Realtime doit porter le jeton de B (RLS appliquée aux événements)
    const { data: session } = await b.client.auth.getSession();
    b.client.realtime.setAuth(session.session!.access_token);

    const received = new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Aucun événement Realtime reçu")), 10000);
      const channel = b.client
        .channel(`test-stock-${limited}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "boosters", filter: `id=eq.${limited}` }, (p) => {
          clearTimeout(timeout);
          void b.client.removeChannel(channel);
          resolve((p.new as { stock_remaining: number }).stock_remaining);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            // Le flux postgres_changes s'active côté serveur peu après SUBSCRIBED.
            // (Dans l'appli, l'abonnement est pris à l'affichage, bien avant tout achat.)
            await new Promise((r) => setTimeout(r, 1500));
            const { error } = await a.client.rpc("open_booster", { p_booster_id: limited });
            if (error) reject(error);
          }
        });
    });

    expect(await received).toBe(before!.stock_remaining! - 1);
  });
});
