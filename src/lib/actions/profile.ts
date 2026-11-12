"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usernameFormatError } from "@/lib/validation";

export type ActionResult = { ok: boolean; message: string | null };

const SETTINGS = ["sound_enabled", "reduced_motion", "hide_activity"] as const;
type SettingKey = (typeof SETTINGS)[number];

/** Paramètres du profil (colonnes non sensibles, autorisées par RLS + droits de colonnes). */
export async function updateSetting(key: SettingKey, value: boolean): Promise<ActionResult> {
  if (!SETTINGS.includes(key)) return { ok: false, message: "Paramètre inconnu." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, message: "Session expirée, reconnecte-toi." };

  const { error } = await supabase
    .from("profiles")
    .update({ [key]: value } as Record<SettingKey, boolean>)
    .eq("id", userId);
  if (error) return { ok: false, message: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: true, message: null };
}

export async function updateUsername(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "").trim();
  const formatError = usernameFormatError(username);
  if (formatError) return { ok: false, message: formatError };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_username", { p_username: username });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Changement impossible." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Pseudo mis à jour. Joli crochet !" };
}
