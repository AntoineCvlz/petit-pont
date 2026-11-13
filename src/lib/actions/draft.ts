"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DraftActionResult = { ok: true; draftId: string; completed: boolean } | { ok: false; message: string };

function fail(error: { code?: string; message: string }): DraftActionResult {
  return { ok: false, message: error.code === "P0001" ? error.message : "Action impossible, réessaie." };
}

/** Lance un draft : la base tire les propositions, le client ne fournit que la formation. */
export async function startDraft(formation: string): Promise<DraftActionResult> {
  if (!/^[0-9]{3,4}$/.test(formation)) return { ok: false, message: "Formation inconnue." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_draft", { p_formation: formation });
  if (error) return fail(error);
  revalidatePath("/draft");
  return { ok: true, draftId: (data as { id: string }).id, completed: false };
}

/** Choisit la carte n° choice (1 à 5) parmi les propositions du poste en cours. */
export async function pickDraft(draftId: string, choice: number): Promise<DraftActionResult> {
  if (!/^[0-9a-f-]{36}$/.test(draftId) || !Number.isInteger(choice) || choice < 1 || choice > 5) {
    return { ok: false, message: "Choix invalide." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("draft_pick", { p_draft_id: draftId, p_choice: choice });
  if (error) return fail(error);
  revalidatePath("/draft");
  return { ok: true, draftId, completed: (data as { status: string }).status === "completed" };
}

export async function abandonDraft(draftId: string): Promise<DraftActionResult> {
  if (!/^[0-9a-f-]{36}$/.test(draftId)) return { ok: false, message: "Draft introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("abandon_draft", { p_draft_id: draftId });
  if (error) return fail(error);
  revalidatePath("/draft");
  return { ok: true, draftId, completed: false };
}
