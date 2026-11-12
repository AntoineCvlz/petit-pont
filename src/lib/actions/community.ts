"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CommunityResult = { ok: boolean; message: string | null };

export async function setShowcase(instanceIds: string[]): Promise<CommunityResult> {
  if (!Array.isArray(instanceIds) || instanceIds.length > 5) return { ok: false, message: "5 cartes au maximum." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_showcase", { p_instance_ids: instanceIds });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Vitrine mise à jour." };
}

export async function markNotificationRead(id: number): Promise<CommunityResult> {
  if (!Number.isInteger(id)) return { ok: false, message: null };
  const supabase = await createClient();
  // Écriture directe autorisée : colonne is_read uniquement, sur ses propres lignes (RLS)
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) return { ok: false, message: "Impossible de marquer comme lu." };
  revalidatePath("/", "layout");
  return { ok: true, message: null };
}

export async function markAllNotificationsRead(): Promise<CommunityResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) return { ok: false, message: "Impossible de tout marquer comme lu." };
  revalidatePath("/", "layout");
  return { ok: true, message: null };
}


