"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClaimResult = { ok: true; reward: number; balance: number } | { ok: false; message: string };

/** La complétion est revérifiée côté serveur par claim_album_reward. */
export async function claimAlbumReward(albumId: number): Promise<ClaimResult> {
  if (!Number.isInteger(albumId)) return { ok: false, message: "Album invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_album_reward", { p_album_id: albumId });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Réclamation impossible, réessaie." };
  const r = data as { reward: number; balance: number };
  revalidatePath("/", "layout");
  return { ok: true, reward: r.reward, balance: r.balance };
}
