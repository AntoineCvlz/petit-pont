import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView } from "@/lib/data/cards";
import type { Metric, Period } from "@/lib/leaderboard";
import { compareRarityDesc } from "@/lib/rarity";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  value: number;
  isMe: boolean;
};

/** Avatars (Discord) d'une liste de joueurs, lus en une requête. */
async function getAvatars(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, avatar_url").in("id", ids).not("avatar_url", "is", null);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, p.avatar_url!]));
}

export async function getLeaderboard(metric: Metric, period: Period, limit = 50): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", { p_metric: metric, p_period: period, p_limit: limit });
  if (error) throw error;
  const avatars = await getAvatars(data.map((r) => r.user_id));
  return data.map((r) => ({
    rank: Number(r.rank),
    userId: r.user_id,
    username: r.username,
    avatarUrl: avatars.get(r.user_id) ?? null,
    value: Number(r.value),
    isMe: r.is_me,
  }));
}

export async function getLeaderboardRefreshedAt(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("leaderboard_stats").select("refreshed_at").limit(1).maybeSingle();
  return data?.refreshed_at ?? null;
}

export type PlayerStats = { cards: number; distinctCards: number; progression: number; rarityScore: number; albums: number; boosters: number };

export async function getPlayerStats(userId: string): Promise<PlayerStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leaderboard_stats").select("*").eq("user_id", userId).eq("period", "all").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    cards: data.cards ?? 0,
    distinctCards: data.distinct_cards ?? 0,
    progression: Number(data.progression ?? 0),
    rarityScore: Number(data.rarity_score ?? 0),
    albums: data.albums ?? 0,
    boosters: data.boosters ?? 0,
  };
}

export type PlayerSummary = { id: string; username: string; avatarUrl: string | null; createdAt: string; isDemo: boolean };

export async function getPlayerByUsername(username: string): Promise<PlayerSummary | null> {
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(username)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at, is_demo")
    .ilike("username", username.replace(/_/g, "\\_"))
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, username: data.username, avatarUrl: data.avatar_url, createdAt: data.created_at, isDemo: data.is_demo } : null;
}

/** Recherche de joueurs par pseudo (jokers SQL neutralisés). */
export async function searchPlayers(q: string, limit = 30): Promise<(PlayerSummary & { stats: PlayerStats | null })[]> {
  const term = q.trim().replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 20);
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, username, avatar_url, created_at, is_demo").order("username").limit(limit);
  if (term) query = query.ilike("username", `%${term.replace(/[_%]/g, (m) => `\\${m}`)}%`);
  const { data, error } = await query;
  if (error) throw error;
  const ids = data.map((p) => p.id);
  const { data: stats } = ids.length
    ? await supabase.from("leaderboard_stats").select("user_id, cards, distinct_cards, progression, rarity_score, albums, boosters").eq("period", "all").in("user_id", ids)
    : { data: [] };
  const byId = new Map((stats ?? []).map((s) => [s.user_id, s]));
  return data.map((p) => {
    const s = byId.get(p.id);
    return {
      id: p.id,
      username: p.username,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
      isDemo: p.is_demo,
      stats: s
        ? {
            cards: s.cards ?? 0,
            distinctCards: s.distinct_cards ?? 0,
            progression: Number(s.progression ?? 0),
            rarityScore: Number(s.rarity_score ?? 0),
            albums: s.albums ?? 0,
            boosters: s.boosters ?? 0,
          }
        : null,
    };
  });
}

export type ShowcaseCard = { slot: number; instanceId: string; serialNumber: number; template: CardTemplateView };

export async function getShowcase(userId: string): Promise<ShowcaseCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_showcase")
    .select(`slot, instance_id, card_instances!inner ( serial_number, card_templates!inner ( ${TEMPLATE_SELECT} ) )`)
    .eq("user_id", userId)
    .order("slot");
  if (error) throw error;
  return (data as unknown as { slot: number; instance_id: string; card_instances: { serial_number: number; card_templates: Parameters<typeof toTemplateView>[0] } }[]).map(
    (r) => ({ slot: r.slot, instanceId: r.instance_id, serialNumber: r.card_instances.serial_number, template: toTemplateView(r.card_instances.card_templates) }),
  );
}

export async function getWishlist(userId: string): Promise<CardTemplateView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select(`created_at, card_templates!inner ( ${TEMPLATE_SELECT} )`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as { card_templates: Parameters<typeof toTemplateView>[0] }[]).map((r) => toTemplateView(r.card_templates));
}

export type DuplicateOffer = { template: CardTemplateView; spare: number };

/** Doublons disponibles à l'échange : exemplaires libres au-delà du premier, par carte. */
export async function getTradeableDuplicates(userId: string): Promise<DuplicateOffer[]> {
  const supabase = await createClient();
  const data = await fetchAll((from, to) =>
    supabase
      .from("card_instances")
      .select(`id, template_id, is_locked, card_templates!inner ( ${TEMPLATE_SELECT} )`)
      .eq("owner_id", userId)
      .order("id")
      .range(from, to),
  );
  const rows = data as unknown as { template_id: number; is_locked: boolean; card_templates: Parameters<typeof toTemplateView>[0] }[];
  const byTpl = new Map<number, { template: CardTemplateView; total: number; free: number }>();
  for (const r of rows) {
    const cur = byTpl.get(r.template_id) ?? { template: toTemplateView(r.card_templates), total: 0, free: 0 };
    cur.total += 1;
    if (!r.is_locked) cur.free += 1;
    byTpl.set(r.template_id, cur);
  }
  return [...byTpl.values()]
    .map((v) => ({ template: v.template, spare: Math.min(v.free, v.total - 1) }))
    .filter((d) => d.spare > 0)
    .sort((a, b) => compareRarityDesc(a.template.rarity, b.template.rarity) || b.template.rating - a.template.rating);
}

export type WishlistMatch = { userId: string; username: string; avatarUrl: string | null; matches: number; cards: CardTemplateView[] };

/** « Ces joueurs ont des cartes de ta liste de souhaits » (doublons croisés). */
export async function getWishlistMatches(limit = 6): Promise<WishlistMatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wishlist_matches", { p_limit: limit });
  if (error) throw error;
  const ids = [...new Set(data.flatMap((m) => m.template_ids))];
  if (ids.length === 0) return [];
  const { data: tpls, error: tError } = await supabase.from("card_templates").select(TEMPLATE_SELECT).in("id", ids);
  if (tError) throw tError;
  const byId = new Map(tpls.map((t) => [t.id, toTemplateView(t as never)]));
  const avatars = await getAvatars(data.map((m) => m.user_id));
  return data.map((m) => ({
    userId: m.user_id,
    username: m.username,
    avatarUrl: avatars.get(m.user_id) ?? null,
    matches: m.matches,
    cards: m.template_ids.map((id) => byId.get(id)).filter((t): t is CardTemplateView => Boolean(t)),
  }));
}

export type AlbumBadge = { slug: string; name: string; completedAt: string };

export async function getCompletedAlbums(userId: string): Promise<AlbumBadge[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("album_completions")
    .select("completed_at, albums!inner ( slug, name )")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({ slug: r.albums.slug, name: r.albums.name, completedAt: r.completed_at }));
}
