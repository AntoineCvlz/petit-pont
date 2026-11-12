import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView, type FlagLayout, type NationView } from "@/lib/data/cards";
import { normalizeSearch } from "@/lib/market";
import { compareRarityDesc, type PlayerPosition, type Rarity } from "@/lib/rarity";

export type PlayerListItem = {
  slug: string;
  displayName: string;
  position: PlayerPosition;
  isLegend: boolean;
  nation: NationView;
  bestRarity: Rarity | null;
  versions: number;
};

export async function listPlayers(search?: string): Promise<PlayerListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("players")
    .select("slug, display_name, position, is_legend, nations!inner ( code, name, flag_colors, flag_layout ), card_templates ( rarity )")
    .order("display_name");
  // Insensible aux accents ; caractères spéciaux neutralisés par normalizeSearch
  const term = normalizeSearch(search ?? "").slice(0, 60);
  if (term) query = query.ilike("search_text", `%${term}%`);
  const { data, error } = await query;
  if (error) throw error;

  return data.map((p) => {
    const rarities = p.card_templates.map((t) => t.rarity).sort(compareRarityDesc);
    return {
      slug: p.slug,
      displayName: p.display_name,
      position: p.position,
      isLegend: p.is_legend,
      nation: {
        code: p.nations.code,
        name: p.nations.name,
        flagColors: p.nations.flag_colors,
        flagLayout: p.nations.flag_layout as FlagLayout,
      },
      bestRarity: rarities[0] ?? null,
      versions: rarities.length,
    };
  });
}

export type PlayerDetail = {
  slug: string;
  displayName: string;
  firstName: string | null;
  lastName: string;
  position: PlayerPosition;
  birthYear: number | null;
  isLegend: boolean;
  bio: string | null;
  nation: NationView;
  clubs: { name: string; startYear: number | null; endYear: number | null }[];
  versions: (CardTemplateView & { circulation: number; averagePrice: number | null; salesCount: number })[];
};

export async function getPlayer(slug: string): Promise<PlayerDetail | null> {
  const supabase = await createClient();
  const { data: player, error } = await supabase
    .from("players")
    .select(
      `id, slug, display_name, first_name, last_name, position, birth_year, is_legend, bio,
       nations!inner ( code, name, flag_colors, flag_layout ),
       player_clubs ( start_year, end_year, clubs!inner ( name ) )`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!player) return null;

  const { data: templates, error: tplError } = await supabase
    .from("card_templates")
    .select(TEMPLATE_SELECT)
    .eq("player_id", player.id)
    .order("collection_number");
  if (tplError) throw tplError;

  const templateIds = templates.map((t) => t.id);
  const { data: sales, error: salesError } = templateIds.length
    ? await supabase.from("market_sales").select("template_id, price").in("template_id", templateIds)
    : { data: [], error: null };
  if (salesError) throw salesError;

  const priceStats = new Map<number, { total: number; count: number }>();
  for (const s of sales ?? []) {
    const cur = priceStats.get(s.template_id) ?? { total: 0, count: 0 };
    cur.total += s.price;
    cur.count += 1;
    priceStats.set(s.template_id, cur);
  }

  const clubs = [...player.player_clubs]
    .sort((a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999))
    .map((pc) => ({ name: pc.clubs.name, startYear: pc.start_year, endYear: pc.end_year }));

  return {
    slug: player.slug,
    displayName: player.display_name,
    firstName: player.first_name,
    lastName: player.last_name,
    position: player.position,
    birthYear: player.birth_year,
    isLegend: player.is_legend,
    bio: player.bio,
    nation: {
      code: player.nations.code,
      name: player.nations.name,
      flagColors: player.nations.flag_colors,
      flagLayout: player.nations.flag_layout as FlagLayout,
    },
    clubs,
    versions: templates.map((t) => {
      const view = toTemplateView(t as never);
      const stats = priceStats.get(t.id);
      return {
        ...view,
        circulation: t.minted_count,
        averagePrice: stats ? Math.round(stats.total / stats.count) : null,
        salesCount: stats?.count ?? 0,
      };
    }),
  };
}
