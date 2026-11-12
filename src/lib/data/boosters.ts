import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView } from "@/lib/data/cards";
import { normalizeOdds, parseAvailability, type Availability, type BoosterKind, type Odds } from "@/lib/boosters";
import { compareRarityDesc, type Rarity } from "@/lib/rarity";

export type BoosterView = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  kind: BoosterKind;
  price: number;
  cardsCount: number;
  guaranteeRarity: Rarity | null;
  guaranteeCount: number;
  startsAt: string | null;
  endsAt: string | null;
  stockTotal: number | null;
  stockRemaining: number | null;
  imageUrl: string | null;
  odds: Odds;
  availability: Availability;
};

const BOOSTER_SELECT =
  "id, slug, name, description, kind, price, cards_count, guarantee_rarity, guarantee_count, starts_at, ends_at, stock_total, stock_remaining, image_url, booster_odds ( rarity, probability )";

type BoosterRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  kind: BoosterKind;
  price: number;
  cards_count: number;
  guarantee_rarity: Rarity | null;
  guarantee_count: number;
  starts_at: string | null;
  ends_at: string | null;
  stock_total: number | null;
  stock_remaining: number | null;
  image_url: string | null;
  booster_odds: { rarity: Rarity; probability: number }[];
};

async function withAvailability(rows: BoosterRow[]): Promise<BoosterView[]> {
  const supabase = await createClient();
  const availabilities = await Promise.all(
    rows.map((b) => supabase.rpc("booster_availability", { p_booster: b.id }).then(({ data }) => parseAvailability(data))),
  );
  return rows.map((b, i) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    kind: b.kind,
    price: b.price,
    cardsCount: b.cards_count,
    guaranteeRarity: b.guarantee_rarity,
    guaranteeCount: b.guarantee_count,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    stockTotal: b.stock_total,
    stockRemaining: b.stock_remaining,
    imageUrl: b.image_url,
    odds: normalizeOdds(b.booster_odds),
    availability: availabilities[i]!,
  }));
}

/** Boosters visibles en boutique (actifs, événements non terminés). */
export async function listBoosters(): Promise<BoosterView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boosters")
    .select(BOOSTER_SELECT)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order("sort_order");
  if (error) throw error;
  return withAvailability(data as BoosterRow[]);
}

export async function getBooster(slug: string): Promise<BoosterView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boosters")
    .select(BOOSTER_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [view] = await withAvailability([data as BoosterRow]);
  return view!;
}

/** Cartes possibles : pool restreint du booster, sinon tout le catalogue actif. */
export async function getBoosterPool(boosterId: number): Promise<CardTemplateView[]> {
  const supabase = await createClient();
  const { data: pool, error: poolError } = await supabase
    .from("booster_cards")
    .select("template_id")
    .eq("booster_id", boosterId);
  if (poolError) throw poolError;

  let query = supabase.from("card_templates").select(TEMPLATE_SELECT).eq("is_active", true);
  if (pool.length > 0) query = query.in("id", pool.map((p) => p.template_id));
  const { data, error } = await query;
  if (error) throw error;
  return data
    .map((row) => toTemplateView(row as never))
    .sort((a, b) => compareRarityDesc(a.rarity, b.rarity) || b.rating - a.rating);
}

/** Date à laquelle le booster gratuit sera de nouveau disponible (null = disponible). */
export type FreeBoosterStatus = { slug: string; name: string; cardsCount: number; nextAt: string | null };

export async function getFreeBoosterNextAt(): Promise<FreeBoosterStatus | null> {
  const supabase = await createClient();
  const { data: booster } = await supabase
    .from("boosters")
    .select("id, slug, name, cards_count")
    .eq("kind", "free")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (!booster) return null;
  const { data } = await supabase.rpc("booster_availability", { p_booster: booster.id });
  const a = parseAvailability(data);
  const base = { slug: booster.slug, name: booster.name, cardsCount: booster.cards_count };
  if (a.available) return { ...base, nextAt: null };
  if (a.reason === "cooldown") return { ...base, nextAt: a.nextAt };
  return null;
}

export async function getDuplicatePrices(): Promise<Partial<Record<Rarity, number>>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", "duplicate_sell_prices").single();
  if (error) throw error;
  return data.value as Partial<Record<Rarity, number>>;
}

export type BoosterGift = {
  slug: string;
  name: string;
  kind: BoosterKind;
  cardsCount: number;
  imageUrl: string | null;
  count: number;
  nextGrantId: string;
};

/** Packs offerts par l'équipe et pas encore ouverts, regroupés par booster. */
export async function listMyGifts(): Promise<BoosterGift[]> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("booster_grants")
    .select("id, created_at, boosters!inner ( slug, name, kind, cards_count, image_url, is_active )")
    .eq("user_id", userId)
    .is("opened_at", null)
    .order("created_at")
    .order("id");
  if (error) throw error;

  const bySlug = new Map<string, BoosterGift>();
  for (const g of data) {
    const b = g.boosters;
    if (!b.is_active) continue;
    const cur = bySlug.get(b.slug);
    if (cur) cur.count += 1;
    else
      bySlug.set(b.slug, {
        slug: b.slug,
        name: b.name,
        kind: b.kind,
        cardsCount: b.cards_count,
        imageUrl: b.image_url,
        count: 1,
        nextGrantId: g.id,
      });
  }
  return [...bySlug.values()];
}
