import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Rarity } from "@/lib/rarity";

export type ActivityItem = {
  id: number;
  type: "rare_pull" | "album_completed" | "big_sale" | "leaderboard_top10";
  createdAt: string;
  username: string;
  card: { playerName: string; playerSlug: string; rarity: Rarity; edition: string } | null;
  albumName: string | null;
  payload: Record<string, unknown>;
};

/** Fil d'activité public (alimenté uniquement par le serveur). */
export async function getActivityFeed(limit = 15): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_feed")
    .select(
      `id, type, created_at, payload,
       profiles!inner ( username ),
       card_templates ( rarity, edition, players!inner ( display_name, slug ) ),
       albums ( name )`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    username: row.profiles.username,
    card: row.card_templates
      ? {
          playerName: row.card_templates.players.display_name,
          playerSlug: row.card_templates.players.slug,
          rarity: row.card_templates.rarity,
          edition: row.card_templates.edition,
        }
      : null,
    albumName: row.albums?.name ?? null,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}
