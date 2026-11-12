"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tradeDraftError, type TradeDraft } from "@/lib/trades";

export type TradeResult = { ok: true; message: string } | { ok: false; message: string };

function fail(error: { code?: string; message: string }, fallback: string): TradeResult {
  return { ok: false, message: error.code === "P0001" ? error.message : fallback };
}

export async function proposeTrade(recipientId: string, draft: TradeDraft, parentTradeId: string | null): Promise<TradeResult> {
  const local = tradeDraftError(draft, Number.MAX_SAFE_INTEGER); // le solde est revérifié par la RPC
  if (local) return { ok: false, message: local };
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_trade", {
    p_recipient: recipientId,
    p_offered: draft.offered,
    p_requested: draft.requested,
    p_proposer_coins: draft.giveCoins,
    p_recipient_coins: draft.askCoins,
    p_message: draft.message,
    p_parent: parentTradeId ?? undefined,
  });
  if (error) return fail(error, "Proposition impossible, réessaie.");
  revalidatePath("/", "layout");
  return { ok: true, message: parentTradeId ? "Contre-proposition envoyée !" : "Proposition envoyée !" };
}

export async function acceptTrade(tradeId: string): Promise<TradeResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_trade", { p_trade_id: tradeId });
  if (error) return fail(error, "Acceptation impossible, réessaie.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Échange conclu, poignée de main !" };
}

export async function declineTrade(tradeId: string): Promise<TradeResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_trade", { p_trade_id: tradeId });
  if (error) return fail(error, "Refus impossible, réessaie.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Proposition refusée." };
}

export async function cancelTrade(tradeId: string): Promise<TradeResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_trade", { p_trade_id: tradeId });
  if (error) return fail(error, "Annulation impossible, réessaie.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Proposition annulée." };
}
