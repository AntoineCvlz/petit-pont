import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cardEmbedResponse, findPlayerVersions, normalizeName, verifyDiscordSignature, type CardVersion } from "@/lib/discord";

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex");
  return { raw, privateKey };
}

describe("signature des interactions Discord", () => {
  it("accepte une requête signée et refuse une requête modifiée", () => {
    const { raw, privateKey } = keyPair();
    const body = JSON.stringify({ type: 1 });
    const ts = "1700000000";
    const sig = sign(null, Buffer.from(ts + body), privateKey).toString("hex");
    expect(verifyDiscordSignature(raw, sig, ts, body)).toBe(true);
    expect(verifyDiscordSignature(raw, sig, ts, body + " ")).toBe(false);
    expect(verifyDiscordSignature(raw, sig, "1700000001", body)).toBe(false);
  });

  it("refuse les formats invalides sans planter", () => {
    expect(verifyDiscordSignature("zz", "00", "1", "{}")).toBe(false);
    expect(verifyDiscordSignature("a".repeat(64), "b".repeat(128), "1", "{}")).toBe(false);
  });
});

const v = (o: Partial<CardVersion>): CardVersion => ({
  playerName: "Kylian Mbappé",
  playerSlug: "mbappe",
  imageUrl: "/media/players/mbappe.webp",
  rarity: "legendaire",
  rating: 91,
  edition: "Base",
  season: "Saison 2026",
  club: "Real Madrid",
  maxSupply: 100,
  mintedCount: 12,
  ...o,
});

describe("recherche de carte", () => {
  const catalog = [
    v({}),
    v({ rarity: "speciale", rating: 95, edition: "Holo" }),
    v({ playerName: "Lionel Messi", playerSlug: "messi", rating: 88 }),
    v({ playerName: "Marcus Thuram", playerSlug: "marcus-thuram", rating: 84 }),
  ];

  it("ignore accents et casse", () => {
    expect(normalizeName("  Mbappé ! ")).toBe("mbappe");
    expect(findPlayerVersions("MBAPPE", catalog).map((c) => c.rating)).toEqual([95, 91]);
  });

  it("trouve par début de nom ou de prénom", () => {
    expect(findPlayerVersions("thu", catalog)[0]!.playerSlug).toBe("marcus-thuram");
    expect(findPlayerVersions("lionel", catalog)[0]!.playerSlug).toBe("messi");
    expect(findPlayerVersions("zidane", catalog)).toEqual([]);
  });

  it("répond avec un embed et une vignette absolue", () => {
    const r = cardEmbedResponse(findPlayerVersions("mbappe", catalog), "https://pp.example");
    expect(r.type).toBe(4);
    expect(r.data.embeds[0]!.thumbnail).toEqual({ url: "https://pp.example/media/players/mbappe.webp" });
    expect(r.data.embeds[0]!.description).toContain("**95** · Spéciale · Holo");
  });
});
