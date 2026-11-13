import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { cardEmbedResponse, ephemeral, findPlayerVersions, verifyDiscordSignature, type CardVersion } from "@/lib/discord";
import { supabaseEnv } from "@/lib/env";
import { publicOrigin } from "@/lib/origin";
import type { Rarity } from "@/lib/rarity";

/**
 * Point d'entrée des commandes Discord (slash commands), à renseigner dans le portail développeur Discord :
 *   https://<site>/api/discord/interactions
 * Chaque requête est signée par Discord (Ed25519) : sans signature valide, refus 401.
 * Lecture seule du catalogue avec la clé publique (aucune donnée de joueur).
 */
export async function POST(request: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return NextResponse.json({ error: "Commandes Discord non configurées" }, { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  if (!verifyDiscordSignature(publicKey, signature, timestamp, body)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const interaction = JSON.parse(body) as {
    type: number;
    data?: { name?: string; options?: { name: string; value: string }[] };
  };
  if (interaction.type === 1) return NextResponse.json({ type: 1 }); // PING de vérification

  if (interaction.type === 2 && interaction.data?.name === "carte") {
    const query = String(interaction.data.options?.find((o) => o.name === "joueur")?.value ?? "").slice(0, 60);
    const { url, key } = supabaseEnv();
    const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("card_templates")
      .select(
        "rarity, rating, edition, season, max_supply, minted_count, image_url, players!inner ( slug, display_name, image_url ), clubs ( name )",
      )
      .eq("is_active", true)
      .limit(5000);
    if (error) return NextResponse.json(ephemeral("Catalogue indisponible, réessaie dans un instant."));

    const versions: CardVersion[] = data.map((t) => ({
      playerName: t.players.display_name,
      playerSlug: t.players.slug,
      imageUrl: t.image_url ?? t.players.image_url,
      rarity: t.rarity as Rarity,
      rating: t.rating,
      edition: t.edition,
      season: t.season,
      club: t.clubs?.name ?? null,
      maxSupply: t.max_supply,
      mintedCount: t.minted_count,
    }));
    const found = findPlayerVersions(query, versions);
    if (found.length === 0) return NextResponse.json(ephemeral(`Aucune carte pour « ${query} ».`));
    return NextResponse.json(cardEmbedResponse(found, publicOrigin(request.headers)));
  }

  return NextResponse.json(ephemeral("Commande inconnue."));
}
