import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CoinTxType } from "@/lib/economy";

export type DailyBonusStatus = { available: boolean; amount: number; nextAt: string | null };

export async function getDailyBonusStatus(): Promise<DailyBonusStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("daily_bonus_status");
  if (error) throw error;
  const r = (data ?? {}) as { available?: boolean; amount?: number; next_at?: string };
  return { available: Boolean(r.available), amount: Number(r.amount ?? 0), nextAt: r.next_at ?? null };
}

export type CoinTransaction = {
  id: number;
  amount: number;
  balanceAfter: number;
  type: CoinTxType;
  description: string | null;
  createdAt: string;
};

export const COIN_PAGE_SIZE = 25;

/** Journal des pièces du joueur (RLS : uniquement ses propres mouvements). */
export async function listCoinTransactions(
  userId: string,
  { page, type }: { page: number; type: CoinTxType | null },
): Promise<{ rows: CoinTransaction[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * COIN_PAGE_SIZE;
  let query = supabase
    .from("coin_transactions")
    .select("id, amount, balance_after, type, description, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + COIN_PAGE_SIZE - 1);
  if (type) query = query.eq("type", type);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    total: count ?? 0,
    rows: data.map((r) => ({
      id: r.id,
      amount: r.amount,
      balanceAfter: r.balance_after,
      type: r.type,
      description: r.description,
      createdAt: r.created_at,
    })),
  };
}

/** Totaux gagnés / dépensés du joueur connecté, calculés en base. */
export async function getCoinTotals(): Promise<{ earned: number; spent: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_coin_totals").single();
  if (error) throw error;
  return { earned: Number(data.earned), spent: Number(data.spent) };
}
