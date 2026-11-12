"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ModerationResult = { ok: boolean; message: string };

function fail(error: { code?: string; message: string }): ModerationResult {
  return { ok: false, message: error.code === "P0001" ? error.message : "Action impossible, réessaie." };
}

export async function reportPlayer(playerId: string, reason: string): Promise<ModerationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_player", { p_reported: playerId, p_reason: String(reason ?? "").slice(0, 500) });
  if (error) return fail(error);
  return { ok: true, message: "Signalement envoyé à la modération. Merci !" };
}

export async function blockPlayer(playerId: string): Promise<ModerationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_player", { p_blocked: playerId });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Joueur bloqué : il ne peut plus te proposer d'échange." };
}

export async function unblockPlayer(playerId: string): Promise<ModerationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unblock_player", { p_blocked: playerId });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Joueur débloqué." };
}
