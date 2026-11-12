import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView } from "@/lib/data/cards";
import type { Database } from "@/types/database";

export type AlbumKind = Database["public"]["Enums"]["album_kind"];

export const ALBUM_KIND_LABELS: Record<AlbumKind, string> = {
  competition: "Compétition",
  club: "Club",
  nation: "Sélection",
  season: "Saison",
  legends: "Légendes",
};

export type AlbumSummary = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  kind: AlbumKind;
  rewardCoins: number;
  owned: number;
  total: number;
  completedAt: string | null;
};

/** Tous les modèles possédés (avec répétitions : un élément par exemplaire), lecture paginée. */
async function ownedInstancesTemplateIds(userId: string): Promise<number[]> {
  const supabase = await createClient();
  const rows = await fetchAll((from, to) =>
    supabase.from("card_instances").select("id, template_id").eq("owner_id", userId).order("id").range(from, to),
  );
  return rows.map((r) => r.template_id);
}

async function ownedTemplateIds(userId: string): Promise<Set<number>> {
  return new Set(await ownedInstancesTemplateIds(userId));
}

export async function listAlbums(userId: string): Promise<AlbumSummary[]> {
  const supabase = await createClient();
  const [{ data: albums, error }, owned, { data: completions, error: cError }] = await Promise.all([
    supabase
      .from("albums")
      .select("id, slug, name, description, kind, reward_coins, album_slots ( template_id )")
      .eq("is_active", true)
      .order("sort_order"),
    ownedTemplateIds(userId),
    supabase.from("album_completions").select("album_id, completed_at").eq("user_id", userId),
  ]);
  if (error) throw error;
  if (cError) throw cError;
  const done = new Map(completions.map((c) => [c.album_id, c.completed_at]));

  return albums
    .filter((a) => a.album_slots.length > 0)
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      kind: a.kind,
      rewardCoins: a.reward_coins,
      owned: a.album_slots.filter((s) => owned.has(s.template_id)).length,
      total: a.album_slots.length,
      completedAt: done.get(a.id) ?? null,
    }));
}

export type AlbumSlotView = { slotNumber: number; owned: boolean; copies: number; template: CardTemplateView };

export type AlbumDetail = Omit<AlbumSummary, "owned" | "total"> & { slots: AlbumSlotView[]; owned: number; total: number };

export async function getAlbum(slug: string, userId: string): Promise<AlbumDetail | null> {
  const supabase = await createClient();
  const { data: album, error } = await supabase
    .from("albums")
    .select(`id, slug, name, description, kind, reward_coins, album_slots ( slot_number, card_templates!inner ( ${TEMPLATE_SELECT} ) )`)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!album) return null;

  const [instances, { data: completion, error: cError }] = await Promise.all([
    ownedInstancesTemplateIds(userId),
    supabase.from("album_completions").select("completed_at").eq("user_id", userId).eq("album_id", album.id).maybeSingle(),
  ]);
  if (cError) throw cError;
  const counts = new Map<number, number>();
  for (const id of instances) counts.set(id, (counts.get(id) ?? 0) + 1);

  const slots = album.album_slots
    .map((s) => {
      const template = toTemplateView(s.card_templates as never);
      const copies = counts.get(template.id) ?? 0;
      return { slotNumber: s.slot_number, owned: copies > 0, copies, template };
    })
    .sort((a, b) => a.slotNumber - b.slotNumber);

  return {
    id: album.id,
    slug: album.slug,
    name: album.name,
    description: album.description,
    kind: album.kind,
    rewardCoins: album.reward_coins,
    completedAt: completion?.completed_at ?? null,
    slots,
    owned: slots.filter((s) => s.owned).length,
    total: slots.length,
  };
}
