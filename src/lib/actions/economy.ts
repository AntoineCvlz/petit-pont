"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RARITIES, type Rarity } from "@/lib/rarity";

export type BonusResult = { ok: true; amount: number; balance: number } | { ok: false; message: string };

export async function claimDailyBonus(): Promise<BonusResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_daily_bonus");
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Bonus indisponible, réessaie." };
  const r = data as { amount: number; balance: number };
  revalidatePath("/", "layout");
  return { ok: true, amount: r.amount, balance: r.balance };
}

export type BulkSellResult = { ok: true; sold: number; coins: number; balance: number } | { ok: false; message: string };

export async function sellAllDuplicates(maxRarity: Rarity): Promise<BulkSellResult> {
  if (!RARITIES.includes(maxRarity)) return { ok: false, message: "Rareté invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sell_all_duplicates", { p_max_rarity: maxRarity });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Revente impossible, réessaie." };
  const r = data as { sold: number; coins: number; balance: number };
  revalidatePath("/", "layout");
  return { ok: true, sold: r.sold, coins: r.coins, balance: r.balance };
}
