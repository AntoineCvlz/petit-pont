import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView } from "@/lib/data/cards";
import { MARKET_PAGE_SIZE, PRICE_BUCKETS, normalizeSearch, type MarketQuery } from "@/lib/market";

export type ListingView = {
  id: string;
  price: number;
  createdAt: string;
  sellerId: string;
  sellerUsername: string;
  serialNumber: number;
  template: CardTemplateView;
};

type ListingRow = {
  id: string;
  price: number;
  created_at: string;
  seller_id: string;
  seller: { username: string };
  card_instances: { serial_number: number };
  card_templates: Parameters<typeof toTemplateView>[0];
};

function listingSelect(clubInner: boolean) {
  const tpl = clubInner ? TEMPLATE_SELECT.replace("clubs (", "clubs!inner (") : TEMPLATE_SELECT;
  return `id, price, created_at, seller_id,
    seller:profiles!market_listings_seller_id_fkey ( username ),
    card_instances!inner ( serial_number ),
    card_templates!inner ( ${tpl} )`;
}

function toListing(r: ListingRow): ListingView {
  return {
    id: r.id,
    price: r.price,
    createdAt: r.created_at,
    sellerId: r.seller_id,
    sellerUsername: r.seller.username,
    serialNumber: r.card_instances.serial_number,
    template: toTemplateView(r.card_templates),
  };
}

/** Annonces actives filtrées côté base (PostgREST), paginées. */
export async function listActiveListings(query: MarketQuery): Promise<{ listings: ListingView[]; total: number }> {
  const supabase = await createClient();
  let q = supabase
    .from("market_listings")
    .select(listingSelect(Boolean(query.club)), { count: "exact" })
    .eq("status", "active");

  const term = normalizeSearch(query.q);
  if (term) q = q.ilike("card_templates.players.search_text", `%${term}%`);
  if (query.rarity) q = q.eq("card_templates.rarity", query.rarity);
  if (query.club) q = q.eq("card_templates.clubs.code", query.club);
  if (query.nation) q = q.eq("card_templates.players.nations.code", query.nation);
  if (query.price) {
    const b = PRICE_BUCKETS[query.price];
    q = q.gte("price", b.min);
    if (b.max !== null) q = q.lt("price", b.max);
  }
  q =
    query.sort === "prix-asc"
      ? q.order("price", { ascending: true }).order("created_at", { ascending: false })
      : query.sort === "prix-desc"
        ? q.order("price", { ascending: false }).order("created_at", { ascending: false })
        : q.order("created_at", { ascending: false });

  const from = (query.page - 1) * MARKET_PAGE_SIZE;
  const { data, error, count } = await q.range(from, from + MARKET_PAGE_SIZE - 1);
  if (error) throw error;
  return { listings: (data as unknown as ListingRow[]).map(toListing), total: count ?? 0 };
}

export async function listMyListings(userId: string): Promise<ListingView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_listings")
    .select(listingSelect(false))
    .eq("status", "active")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ListingRow[]).map(toListing);
}

export async function listActiveListingsForTemplate(templateId: number): Promise<ListingView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_listings")
    .select(listingSelect(false))
    .eq("status", "active")
    .eq("template_id", templateId)
    .order("price", { ascending: true })
    .limit(60);
  if (error) throw error;
  return (data as unknown as ListingRow[]).map(toListing);
}

export type SaleView = {
  id: number;
  price: number;
  createdAt: string;
  sellerUsername: string | null;
  buyerUsername: string | null;
  template: CardTemplateView;
};

type SaleRow = {
  id: number;
  price: number;
  created_at: string;
  seller: { username: string } | null;
  buyer: { username: string } | null;
  card_templates: Parameters<typeof toTemplateView>[0];
};

const SALE_SELECT = `id, price, created_at,
  seller:profiles!market_sales_seller_id_fkey ( username ),
  buyer:profiles!market_sales_buyer_id_fkey ( username ),
  card_templates!inner ( ${TEMPLATE_SELECT} )`;

function toSale(r: SaleRow): SaleView {
  return {
    id: r.id,
    price: r.price,
    createdAt: r.created_at,
    sellerUsername: r.seller?.username ?? null,
    buyerUsername: r.buyer?.username ?? null,
    template: toTemplateView(r.card_templates),
  };
}

export async function listRecentSales(limit = 30): Promise<SaleView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("market_sales").select(SALE_SELECT).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data as unknown as SaleRow[]).map(toSale);
}

export async function listSalesForTemplate(templateId: number, limit = 50): Promise<SaleView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_sales")
    .select(SALE_SELECT)
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as SaleRow[]).map(toSale);
}

export type PriceStats = { sales: number; minPrice: number; maxPrice: number; avgPrice: number; lastPrice: number };

export async function getPriceStats(templateId: number): Promise<PriceStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("market_price_stats").select("*").eq("template_id", templateId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    sales: data.sales ?? 0,
    minPrice: data.min_price ?? 0,
    maxPrice: data.max_price ?? 0,
    avgPrice: data.avg_price ?? 0,
    lastPrice: data.last_price ?? 0,
  };
}

export type WantedCard = { template: CardTemplateView; searches: number; wishes: number; activeListings: number; lowestPrice: number | null };

export async function listMostWanted(limit = 24): Promise<WantedCard[]> {
  const supabase = await createClient();
  const { data: wanted, error } = await supabase
    .from("most_wanted_cards")
    .select("template_id, searches, wishes, score")
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const ids = wanted.map((w) => w.template_id!).filter(Boolean);
  if (ids.length === 0) return [];

  const [{ data: tpls, error: tError }, { data: listings, error: lError }] = await Promise.all([
    supabase.from("card_templates").select(TEMPLATE_SELECT).in("id", ids),
    supabase.from("market_listings").select("template_id, price").eq("status", "active").in("template_id", ids),
  ]);
  if (tError) throw tError;
  if (lError) throw lError;

  const byId = new Map(tpls.map((t) => [t.id, toTemplateView(t as never)]));
  return wanted
    .filter((w) => byId.has(w.template_id!))
    .map((w) => {
      const own = listings.filter((l) => l.template_id === w.template_id);
      return {
        template: byId.get(w.template_id!)!,
        searches: w.searches ?? 0,
        wishes: w.wishes ?? 0,
        activeListings: own.length,
        lowestPrice: own.length ? Math.min(...own.map((l) => l.price)) : null,
      };
    });
}

export async function getMarketFilterOptions() {
  const supabase = await createClient();
  const [{ data: clubs, error: cError }, { data: nations, error: nError }] = await Promise.all([
    supabase.from("clubs").select("code, name").order("name"),
    supabase.from("nations").select("code, name").order("name"),
  ]);
  if (cError) throw cError;
  if (nError) throw nError;
  return {
    clubs: clubs.map((c) => ({ value: c.code, label: c.name })),
    nations: nations.map((n) => ({ value: n.code, label: n.name })),
  };
}

export async function getMarketFeePercent(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", "market_fee_percent").single();
  if (error) throw error;
  return Number(data.value);
}

export async function isOnWishlist(userId: string, templateId: number): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("wishlists")
    .select("template_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("template_id", templateId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Journalise une recherche du marché (dédoublonnée côté serveur, 1 fois par heure). */
export async function recordMarketSearch(args: { query?: string; templateId?: number }) {
  const supabase = await createClient();
  await supabase.rpc("record_market_search", { p_query: args.query ?? undefined, p_template_id: args.templateId ?? undefined });
}
