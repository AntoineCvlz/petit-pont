/**
 * Discord : vérification des requêtes d'interaction (signature Ed25519) et mise en forme des réponses.
 * Fonctions pures (testables) ; la route /api/discord/interactions les utilise.
 */
import { createPublicKey, verify } from "node:crypto";
import { RARITY_LABELS, type Rarity } from "@/lib/rarity";

// En-tête DER d'une clé publique Ed25519 brute (32 octets)
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordSignature(publicKeyHex: string, signatureHex: string, timestamp: string, body: string): boolean {
  try {
    if (!/^[0-9a-f]{64}$/i.test(publicKeyHex) || !/^[0-9a-f]{128}$/i.test(signatureHex)) return false;
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

/** Minuscule, sans accents ni ponctuation : « Mbappé » ≈ « mbappe ». */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type CardVersion = {
  playerName: string;
  playerSlug: string;
  imageUrl: string | null;
  rarity: Rarity;
  rating: number;
  edition: string;
  season: string;
  club: string | null;
  maxSupply: number | null;
  mintedCount: number;
};

const RARITY_COLORS: Record<Rarity, number> = {
  commune: 0xb5c0b9,
  rare: 0x2a6fc0,
  epique: 0x6d2fb8,
  legendaire: 0xb9771a,
  iconique: 0xb3203f,
  speciale: 0x7af0e0,
};

/** Meilleur footballeur correspondant à la recherche : nom exact, puis début de mot, puis contenu. */
export function findPlayerVersions(query: string, versions: CardVersion[]): CardVersion[] {
  const q = normalizeName(query);
  if (!q) return [];
  const bySlug = new Map<string, CardVersion[]>();
  for (const v of versions) bySlug.set(v.playerSlug, [...(bySlug.get(v.playerSlug) ?? []), v]);
  const score = (name: string) => {
    const n = normalizeName(name);
    if (n === q) return 3;
    if (n.split(" ").some((w) => w.startsWith(q)) || n.startsWith(q)) return 2;
    if (n.includes(q)) return 1;
    return 0;
  };
  let best: CardVersion[] = [];
  let bestScore = 0;
  for (const list of bySlug.values()) {
    const s = score(list[0]!.playerName);
    if (s > bestScore || (s === bestScore && s > 0 && list.length > best.length)) {
      best = list;
      bestScore = s;
    }
  }
  return [...best].sort((a, b) => b.rating - a.rating);
}

/** Réponse Discord (type 4) : embed avec toutes les versions de la carte. */
export function cardEmbedResponse(versions: CardVersion[], origin: string) {
  const top = versions[0]!;
  const lines = versions.map(
    (v) =>
      `**${v.rating}** · ${RARITY_LABELS[v.rarity]} · ${v.edition === "Base" ? v.season : v.edition}${v.club ? ` · ${v.club}` : ""}` +
      (v.maxSupply ? ` · ${v.mintedCount}/${v.maxSupply} édités` : ""),
  );
  return {
    type: 4,
    data: {
      embeds: [
        {
          title: top.playerName,
          url: `${origin}/wiki/${top.playerSlug}`,
          description: lines.join("\n").slice(0, 4000),
          color: RARITY_COLORS[top.rarity],
          ...(top.imageUrl
            ? { thumbnail: { url: top.imageUrl.startsWith("http") ? top.imageUrl : `${origin}${top.imageUrl}` } }
            : {}),
          footer: { text: `Petit Pont · ${versions.length} version${versions.length > 1 ? "s" : ""}` },
        },
      ],
    },
  };
}

export function ephemeral(content: string) {
  return { type: 4, data: { content, flags: 64 } };
}
