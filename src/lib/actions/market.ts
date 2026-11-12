"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MarketResult = { ok: true; message: string } | { ok: false; message: string };

function err(error: { code?: string; message: string }, fallback: string): MarketResult {
  return { ok: false, message: error.code === "P0001" ? error.message : fallback };
}

export async function createListing(instanceId: string, price: number): Promise<MarketResult> {
  if (typeof instanceId !== "string" || !Number.isInteger(price)) return { ok: false, message: "Annonce invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_listing", { p_instance_id: instanceId, p_price: price });
  if (error) return err(error, "Mise en vente impossible, réessaie.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Carte mise en vente !" };
}

export async function cancelListing(listingId: string): Promise<MarketResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_listing", { p_listing_id: listingId });
  if (error) return err(error, "Retrait impossible, réessaie.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Annonce retirée." };
}

export async function buyListing(listingId: string): Promise<MarketResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("buy_listing", { p_listing_id: listingId });
  if (error) return err(error, "Achat impossible, réessaie.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Carte achetée, elle est dans ta collection !" };
}

/** Liste de souhaits : écriture directe autorisée par RLS (ses propres lignes uniquement). */
export async function toggleWishlist(templateId: number, wanted: boolean): Promise<MarketResult> {
  if (!Number.isInteger(templateId)) return { ok: false, message: "Carte invalide." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, message: "Session expirée, reconnecte-toi." };

  const { error } = wanted
    ? await supabase.from("wishlists").upsert({ user_id: userId, template_id: templateId }, { onConflict: "user_id,template_id", ignoreDuplicates: true })
    : await supabase.from("wishlists").delete().eq("user_id", userId).eq("template_id", templateId);
  if (error) return { ok: false, message: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: true, message: wanted ? "Ajoutée à ta liste de souhaits." : "Retirée de ta liste de souhaits." };
}
