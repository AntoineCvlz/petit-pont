import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PlayerPosition, Rarity } from "@/lib/rarity";
import { compareRarityDesc } from "@/lib/rarity";

export type FlagLayout = "v" | "h" | "nordic" | "cross" | "disc";

export type NationView = { code: string; name: string; flagColors: string[]; flagLayout: FlagLayout };
export type ClubView = { code: string; name: string; shortName: string; colorPrimary: string; colorSecondary: string };

/** Tout ce qu'il faut pour dessiner une carte. */
export type CardTemplateView = {
  id: number;
  playerSlug: string;
  playerName: string;
  position: PlayerPosition;
  nation: NationView;
  club: ClubView | null;
  season: string;
  edition: string;
  rarity: Rarity;
  rating: number;
  collectionNumber: number;
  maxSupply: number | null;
  mintedCount: number;
  imageUrl: string | null;
};

export const TEMPLATE_SELECT = `
  id, season, edition, rarity, rating, collection_number, max_supply, minted_count, image_url,
  players!inner ( slug, display_name, position, image_url,
    nations!inner ( code, name, flag_colors, flag_layout ) ),
  clubs ( code, name, short_name, color_primary, color_secondary )
` as const;

type TemplateRow = {
  id: number;
  season: string;
  edition: string;
  rarity: Rarity;
  rating: number;
  collection_number: number;
  max_supply: number | null;
  minted_count: number;
  image_url: string | null;
  players: {
    slug: string;
    display_name: string;
    position: PlayerPosition;
    image_url: string | null;
    nations: { code: string; name: string; flag_colors: string[]; flag_layout: string };
  };
  clubs: { code: string; name: string; short_name: string; color_primary: string; color_secondary: string } | null;
};

export function toTemplateView(row: TemplateRow): CardTemplateView {
  return {
    id: row.id,
    playerSlug: row.players.slug,
    playerName: row.players.display_name,
    position: row.players.position,
    nation: {
      code: row.players.nations.code,
      name: row.players.nations.name,
      flagColors: row.players.nations.flag_colors,
      flagLayout: row.players.nations.flag_layout as FlagLayout,
    },
    club: row.clubs
      ? {
          code: row.clubs.code,
          name: row.clubs.name,
          shortName: row.clubs.short_name,
          colorPrimary: row.clubs.color_primary,
          colorSecondary: row.clubs.color_secondary,
        }
      : null,
    season: row.season,
    edition: row.edition,
    rarity: row.rarity,
    rating: row.rating,
    collectionNumber: row.collection_number,
    maxSupply: row.max_supply,
    mintedCount: row.minted_count,
    imageUrl: row.image_url ?? row.players.image_url,
  };
}

/** Nombre total de cartes au catalogue (pour « 042/170 »). */
export const getCollectionTotal = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("card_templates")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
});

export type OwnedCardGroup = {
  template: CardTemplateView;
  copies: { id: string; serialNumber: number; obtainedAt: string; isLocked: boolean }[];
};

/** Collection d'un joueur, regroupée par carte (exemplaires et doublons). */
export async function getCollection(ownerId: string): Promise<OwnedCardGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_instances")
    .select(`id, serial_number, obtained_at, is_locked, card_templates!inner ( ${TEMPLATE_SELECT} )`)
    .eq("owner_id", ownerId)
    .order("obtained_at", { ascending: false });
  if (error) throw error;

  const groups = new Map<number, OwnedCardGroup>();
  for (const row of data as unknown as Array<{
    id: string;
    serial_number: number;
    obtained_at: string;
    is_locked: boolean;
    card_templates: TemplateRow;
  }>) {
    const tpl = row.card_templates;
    let group = groups.get(tpl.id);
    if (!group) {
      group = { template: toTemplateView(tpl), copies: [] };
      groups.set(tpl.id, group);
    }
    group.copies.push({
      id: row.id,
      serialNumber: row.serial_number,
      obtainedAt: row.obtained_at,
      isLocked: row.is_locked,
    });
  }
  return [...groups.values()].sort(
    (a, b) =>
      compareRarityDesc(a.template.rarity, b.template.rarity) ||
      b.template.rating - a.template.rating ||
      a.template.collectionNumber - b.template.collectionNumber,
  );
}

export type CopyHistoryEvent = {
  event: string;
  fromUsername: string | null;
  toUsername: string | null;
  price: number | null;
  createdAt: string;
};

export type OwnedCardDetail = {
  template: CardTemplateView;
  copies: {
    id: string;
    serialNumber: number;
    obtainedAt: string;
    obtainedVia: string;
    isLocked: boolean;
    history: CopyHistoryEvent[];
  }[];
};

/** Détail d'une carte possédée : exemplaires et historique de chacun. */
export async function getOwnedCard(ownerId: string, templateId: number): Promise<OwnedCardDetail | null> {
  const supabase = await createClient();
  const [{ data: tpl, error: tplError }, { data: copies, error: copiesError }] = await Promise.all([
    supabase.from("card_templates").select(TEMPLATE_SELECT).eq("id", templateId).maybeSingle(),
    supabase
      .from("card_instances")
      .select(
        `id, serial_number, obtained_at, obtained_via, is_locked,
         card_instance_history ( event, price, created_at,
           from:profiles!card_instance_history_from_user_id_fkey ( username ),
           to:profiles!card_instance_history_to_user_id_fkey ( username ) )`,
      )
      .eq("owner_id", ownerId)
      .eq("template_id", templateId)
      .order("serial_number"),
  ]);
  if (tplError) throw tplError;
  if (copiesError) throw copiesError;
  if (!tpl || copies.length === 0) return null;

  return {
    template: toTemplateView(tpl as never),
    copies: copies.map((c) => ({
      id: c.id,
      serialNumber: c.serial_number,
      obtainedAt: c.obtained_at,
      obtainedVia: c.obtained_via,
      isLocked: c.is_locked,
      history: c.card_instance_history
        .map((h) => ({
          event: h.event,
          fromUsername: h.from?.username ?? null,
          toUsername: h.to?.username ?? null,
          price: h.price,
          createdAt: h.created_at,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    })),
  };
}

export type RecentCard ={ instanceId: string; serialNumber: number; obtainedAt: string; template: CardTemplateView };

export async function getRecentCards(ownerId: string, limit = 6): Promise<RecentCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_instances")
    .select(`id, serial_number, obtained_at, card_templates!inner ( ${TEMPLATE_SELECT} )`)
    .eq("owner_id", ownerId)
    .order("obtained_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Array<{ id: string; serial_number: number; obtained_at: string; card_templates: TemplateRow }>).map(
    (row) => ({
      instanceId: row.id,
      serialNumber: row.serial_number,
      obtainedAt: row.obtained_at,
      template: toTemplateView(row.card_templates),
    }),
  );
}
