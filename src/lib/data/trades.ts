import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView } from "@/lib/data/cards";
import type { TradeStatus, TradeTab } from "@/lib/trades";

export type TradeItemView = { instanceId: string; fromUserId: string; serialNumber: number; template: CardTemplateView };

export type TradeView = {
  id: string;
  status: TradeStatus;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  message: string | null;
  proposer: { id: string; username: string };
  recipient: { id: string; username: string };
  proposerCoins: number;
  recipientCoins: number;
  parentTradeId: string | null;
  proposerItems: TradeItemView[];
  recipientItems: TradeItemView[];
};

const TRADE_SELECT = `id, status, created_at, expires_at, resolved_at, message, proposer_coins, recipient_coins, parent_trade_id,
  proposer:profiles!trades_proposer_id_fkey ( id, username ),
  recipient:profiles!trades_recipient_id_fkey ( id, username ),
  trade_items ( instance_id, from_user_id,
    card_instances ( serial_number, card_templates!inner ( ${TEMPLATE_SELECT} ) ) )`;

type TradeRow = {
  id: string;
  status: TradeStatus;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
  message: string | null;
  proposer_coins: number;
  recipient_coins: number;
  parent_trade_id: string | null;
  proposer: { id: string; username: string };
  recipient: { id: string; username: string };
  trade_items: {
    instance_id: string;
    from_user_id: string;
    // null si l'exemplaire a depuis été revendu au système (supprimé)
    card_instances: { serial_number: number; card_templates: Parameters<typeof toTemplateView>[0] } | null;
  }[];
};

function toTrade(r: TradeRow): TradeView {
  const items = r.trade_items
    .filter((i) => i.card_instances)
    .map((i) => ({
      instanceId: i.instance_id,
      fromUserId: i.from_user_id,
      serialNumber: i.card_instances!.serial_number,
      template: toTemplateView(i.card_instances!.card_templates),
    }));
  return {
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    resolvedAt: r.resolved_at,
    message: r.message,
    proposer: r.proposer,
    recipient: r.recipient,
    proposerCoins: r.proposer_coins,
    recipientCoins: r.recipient_coins,
    parentTradeId: r.parent_trade_id,
    proposerItems: items.filter((i) => i.fromUserId === r.proposer.id),
    recipientItems: items.filter((i) => i.fromUserId === r.recipient.id),
  };
}

/** Échanges du joueur (RLS : uniquement ceux où il est partie prenante). */
export async function listTrades(userId: string, tab: TradeTab): Promise<TradeView[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase.from("trades").select(TRADE_SELECT);
  if (tab === "recus") q = q.eq("recipient_id", userId).eq("status", "pending").gt("expires_at", nowIso);
  else if (tab === "envoyes") q = q.eq("proposer_id", userId).eq("status", "pending").gt("expires_at", nowIso);
  else q = q.or(`status.neq.pending,expires_at.lte.${nowIso}`);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data as unknown as TradeRow[]).map((r) => {
    const t = toTrade(r);
    // Expirée mais pas encore traitée par la tâche horaire : affichée comme expirée
    return t.status === "pending" && t.expiresAt <= nowIso ? { ...t, status: "expired" as const } : t;
  });
}

export async function getTrade(id: string): Promise<TradeView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trades").select(TRADE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toTrade(data as unknown as TradeRow) : null;
}

export async function countPendingReceived(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return count ?? 0;
}

export async function findPlayerByUsername(username: string): Promise<{ id: string; username: string } | null> {
  const clean = username.trim();
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(clean)) return null;
  const supabase = await createClient();
  // ilike pour ignorer la casse ; « _ » est un joker SQL, on l'échappe
  const pattern = clean.replace(/_/g, "\\_");
  const { data, error } = await supabase.from("profiles").select("id, username").ilike("username", pattern).maybeSingle();
  if (error) throw error;
  return data;
}

export type TradableCopy = { instanceId: string; serialNumber: number; template: CardTemplateView };

/** Exemplaires libres (ni en vente) d'un joueur, proposables dans un échange. */
export async function getTradableCopies(userId: string): Promise<TradableCopy[]> {
  const supabase = await createClient();
  const data = await fetchAll((from, to) =>
    supabase
      .from("card_instances")
      .select(`id, serial_number, card_templates!inner ( ${TEMPLATE_SELECT} )`)
      .eq("owner_id", userId)
      .eq("is_locked", false)
      .order("obtained_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return (data as unknown as { id: string; serial_number: number; card_templates: Parameters<typeof toTemplateView>[0] }[]).map((r) => ({
    instanceId: r.id,
    serialNumber: r.serial_number,
    template: toTemplateView(r.card_templates),
  }));
}

export async function getWishlistTemplateIds(userId: string): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("wishlists").select("template_id").eq("user_id", userId);
  if (error) throw error;
  return data.map((w) => w.template_id);
}

/** Cartes (modèles) déjà possédées par un joueur : pour signaler « tu ne l'as pas encore ». */
export async function getOwnedTemplateIds(userId: string): Promise<number[]> {
  const supabase = await createClient();
  const data = await fetchAll((from, to) =>
    supabase.from("card_instances").select("id, template_id").eq("owner_id", userId).order("id").range(from, to),
  );
  return [...new Set(data.map((r) => r.template_id))];
}
