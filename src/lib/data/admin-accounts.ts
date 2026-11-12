import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { getTemplateCatalog, type CardTemplateView } from "@/lib/data/cards";
import { TRADE_SELECT, toTrade, type TradeRow, type TradeView } from "@/lib/data/trades";
import type { TradeStatus } from "@/lib/trades";

/**
 * Lecture admin des comptes joueurs. Les pages appellent requireAdmin() ;
 * la base n'ouvre ces lectures qu'aux administrateurs (RLS « Admin : … »).
 */

export type AdminAccount = {
  id: string;
  username: string;
  avatarUrl: string | null;
  coins: number;
  isAdmin: boolean;
  isDemo: boolean;
  bannedAt: string | null;
  banReason: string | null;
  createdAt: string;
  cards: number;
};

const ACCOUNT_SELECT =
  "id, username, avatar_url, coins, is_admin, is_demo, banned_at, ban_reason, created_at, card_instances ( count )";

type AccountRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  coins: number;
  is_admin: boolean;
  is_demo: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
  card_instances: { count: number }[];
};

function toAccount(r: AccountRow): AdminAccount {
  return {
    id: r.id,
    username: r.username,
    avatarUrl: r.avatar_url,
    coins: r.coins,
    isAdmin: r.is_admin,
    isDemo: r.is_demo,
    bannedAt: r.banned_at,
    banReason: r.ban_reason,
    createdAt: r.created_at,
    cards: r.card_instances[0]?.count ?? 0,
  };
}

export type AccountFilter = "tous" | "bannis" | "demo";

export async function listAccounts(search: string, filter: AccountFilter = "tous"): Promise<AdminAccount[]> {
  const supabase = await createClient();
  const term = search.trim().replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 20);
  let query = supabase.from("profiles").select(ACCOUNT_SELECT).order("created_at", { ascending: false }).limit(100);
  if (term) query = query.ilike("username", `%${term.replace(/[_%]/g, (m) => `\\${m}`)}%`);
  if (filter === "bannis") query = query.not("banned_at", "is", null);
  if (filter === "demo") query = query.eq("is_demo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as AccountRow[]).map(toAccount);
}

export type AdminCopy = {
  id: string;
  serialNumber: number;
  obtainedVia: string;
  obtainedAt: string;
  isLocked: boolean;
  template: CardTemplateView;
};

export type AdminOpening = {
  id: string;
  createdAt: string;
  username: string;
  userId: string;
  boosterName: string;
  pricePaid: number;
  gifted: boolean;
  cards: CardTemplateView[];
};

export type CoinEntry = {
  id: number;
  amount: number;
  type: string;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
};

export type AdminActionEntry = {
  id: number;
  createdAt: string;
  adminUsername: string | null;
  targetId: string | null;
  targetUsername: string | null;
  action: string;
  details: Record<string, unknown>;
};

export type AccountDetail = {
  account: AdminAccount;
  copies: AdminCopy[];
  pendingGifts: { boosterName: string; count: number }[];
  openings: AdminOpening[];
  trades: TradeView[];
  coins: CoinEntry[];
  actions: AdminActionEntry[];
};

const OPENING_SELECT =
  "id, created_at, user_id, price_paid, grant_id, template_ids, profiles!inner ( username ), boosters!inner ( name )";

type OpeningRow = {
  id: string;
  created_at: string;
  user_id: string;
  price_paid: number;
  grant_id: string | null;
  template_ids: number[];
  profiles: { username: string };
  boosters: { name: string };
};

function toOpening(r: OpeningRow, catalog: Map<number, CardTemplateView>): AdminOpening {
  return {
    id: r.id,
    createdAt: r.created_at,
    username: r.profiles.username,
    userId: r.user_id,
    boosterName: r.boosters.name,
    pricePaid: r.price_paid,
    gifted: r.grant_id !== null,
    cards: r.template_ids.map((id) => catalog.get(id)).filter((t): t is CardTemplateView => Boolean(t)),
  };
}

const ACTION_SELECT =
  "id, created_at, target_id, target_username, action, details, admin:profiles!admin_actions_admin_id_fkey ( username )";

type ActionRow = {
  id: number;
  created_at: string;
  target_id: string | null;
  target_username: string | null;
  action: string;
  details: unknown;
  admin: { username: string } | null;
};

function toAction(r: ActionRow): AdminActionEntry {
  return {
    id: r.id,
    createdAt: r.created_at,
    adminUsername: r.admin?.username ?? null,
    targetId: r.target_id,
    targetUsername: r.target_username,
    action: r.action,
    details: (r.details ?? {}) as Record<string, unknown>,
  };
}

export async function getAccountDetail(id: string): Promise<AccountDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data: account, error } = await supabase.from("profiles").select(ACCOUNT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!account) return null;

  const [catalog, copies, gifts, openings, trades, coins, actions] = await Promise.all([
    getTemplateCatalog(),
    fetchAll((from, to) =>
      supabase
        .from("card_instances")
        .select("id, template_id, serial_number, obtained_via, obtained_at, is_locked")
        .eq("owner_id", id)
        .order("obtained_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    supabase.from("booster_grants").select("boosters!inner ( name )").eq("user_id", id).is("opened_at", null),
    supabase.from("booster_openings").select(OPENING_SELECT).eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    supabase
      .from("trades")
      .select(TRADE_SELECT)
      .or(`proposer_id.eq.${id},recipient_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("coin_transactions")
      .select("id, amount, type, description, balance_after, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(30),
    supabase.from("admin_actions").select(ACTION_SELECT).eq("target_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (gifts.error) throw gifts.error;
  if (openings.error) throw openings.error;
  if (trades.error) throw trades.error;
  if (coins.error) throw coins.error;
  if (actions.error) throw actions.error;

  const giftCounts = new Map<string, number>();
  for (const g of gifts.data) giftCounts.set(g.boosters.name, (giftCounts.get(g.boosters.name) ?? 0) + 1);

  return {
    account: toAccount(account as unknown as AccountRow),
    copies: copies.flatMap((c) => {
      const template = catalog.get(c.template_id);
      return template
        ? [
            {
              id: c.id,
              serialNumber: c.serial_number,
              obtainedVia: c.obtained_via,
              obtainedAt: c.obtained_at,
              isLocked: c.is_locked,
              template,
            },
          ]
        : [];
    }),
    pendingGifts: [...giftCounts].map(([boosterName, count]) => ({ boosterName, count })),
    openings: (openings.data as unknown as OpeningRow[]).map((o) => toOpening(o, catalog)),
    trades: (trades.data as unknown as TradeRow[]).map(toTrade),
    coins: coins.data.map((c) => ({
      id: c.id,
      amount: c.amount,
      type: c.type,
      description: c.description,
      balanceAfter: c.balance_after,
      createdAt: c.created_at,
    })),
    actions: (actions.data as unknown as ActionRow[]).map(toAction),
  };
}

/** Dernières ouvertures de boosters, tous joueurs confondus (« cartes packées »). */
export async function listOpenings(limit = 60): Promise<AdminOpening[]> {
  const supabase = await createClient();
  const [catalog, { data, error }] = await Promise.all([
    getTemplateCatalog(),
    supabase.from("booster_openings").select(OPENING_SELECT).order("created_at", { ascending: false }).limit(limit),
  ]);
  if (error) throw error;
  return (data as unknown as OpeningRow[]).map((o) => toOpening(o, catalog));
}

export async function listAllTrades(status: TradeStatus | "tous", limit = 50): Promise<TradeView[]> {
  const supabase = await createClient();
  let query = supabase.from("trades").select(TRADE_SELECT).order("created_at", { ascending: false }).limit(limit);
  if (status !== "tous") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as TradeRow[]).map(toTrade);
}

export async function listAdminActions(limit = 100): Promise<AdminActionEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_actions")
    .select(ACTION_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as ActionRow[]).map(toAction);
}

/** Choix proposés dans les formulaires « offrir » (boosters actifs, catalogue de cartes). */
export async function getGiftOptions(): Promise<{ boosters: { id: number; name: string }[]; templates: CardTemplateView[] }> {
  const supabase = await createClient();
  const [catalog, { data: boosters, error }] = await Promise.all([
    getTemplateCatalog(),
    supabase.from("boosters").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  if (error) throw error;
  return {
    boosters,
    templates: [...catalog.values()].sort((a, b) => a.collectionNumber - b.collectionNumber),
  };
}
