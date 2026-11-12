import { afterAll, describe, expect, it } from "vitest";
import { admin, coins, createPlayer } from "./helpers";

describe("claim_album_reward en parallèle", () => {
  let albumId: number | null = null;

  afterAll(async () => {
    if (albumId) await admin.from("albums").update({ is_active: false }).eq("id", albumId);
  });

  it("6 réclamations simultanées → une seule récompense", async () => {
    const p = await createPlayer("Album");
    const slug = `integration-${Date.now()}`;
    const { data: album, error } = await admin
      .from("albums")
      .insert({ slug, name: "Album d'intégration", kind: "club", reward_coins: 700 })
      .select("id")
      .single();
    if (error) throw error;
    albumId = album.id;

    const { data: tpls } = await admin.from("card_templates").select("id").eq("rarity", "commune").order("id").limit(2);
    await admin.from("album_slots").insert(tpls!.map((t, i) => ({ album_id: album.id, slot_number: i + 1, template_id: t.id })));
    for (const t of tpls!) {
      const { error: mintError } = await admin.rpc("_mint_card", { p_template: t.id, p_owner: p.id, p_via: "test" });
      if (mintError) throw mintError;
    }

    const before = await coins(p.id);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => p.client.rpc("claim_album_reward", { p_album_id: album.id })),
    );
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.filter((r) => r.error).every((r) => r.error!.message.includes("déjà réclamée"))).toBe(true);
    expect((await coins(p.id)) - before).toBe(700);
  });
});
