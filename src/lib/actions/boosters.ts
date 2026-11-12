"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView } from "@/lib/data/cards";

export type PulledCard = {
  instanceId: string;
  serialNumber: number;
  isNew: boolean;
  template: CardTemplateView;
};

export type OpenBoosterResult =
  | { ok: true; openingId: string; balance: number; cards: PulledCard[] }
  | { ok: false; message: string };

type RpcCard = { instance_id: string; template_id: number; serial_number: number; is_new: boolean };

/** Ouvre un booster : tout le tirage et le paiement se font dans la RPC open_booster. */
export async function openBooster(boosterId: number): Promise<OpenBoosterResult> {
  if (!Number.isInteger(boosterId)) return { ok: false, message: "Booster invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_booster", { p_booster_id: boosterId });
  if (error) {
    return { ok: false, message: error.code === "P0001" ? error.message : "Ouverture impossible, réessaie." };
  }

  const result = data as { opening_id: string; balance: number; cards: RpcCard[] };
  const ids = [...new Set(result.cards.map((c) => c.template_id))];
  const { data: templates, error: tplError } = await supabase.from("card_templates").select(TEMPLATE_SELECT).in("id", ids);
  if (tplError) return { ok: false, message: "Cartes obtenues, mais affichage impossible : retrouve-les dans ta collection." };

  const byId = new Map(templates.map((t) => [t.id, toTemplateView(t as never)]));
  revalidatePath("/", "layout");
  return {
    ok: true,
    openingId: result.opening_id,
    balance: result.balance,
    cards: result.cards.map((c) => ({
      instanceId: c.instance_id,
      serialNumber: c.serial_number,
      isNew: c.is_new,
      template: byId.get(c.template_id)!,
    })),
  };
}

export type SellResult = { ok: true; sold: number; coins: number; balance: number } | { ok: false; message: string };

export async function sellDuplicates(instanceIds: string[]): Promise<SellResult> {
  if (!Array.isArray(instanceIds) || instanceIds.length === 0) return { ok: false, message: "Aucun doublon sélectionné." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sell_duplicates", { p_instance_ids: instanceIds });
  if (error) {
    return { ok: false, message: error.code === "P0001" ? error.message : "Revente impossible, réessaie." };
  }
  const r = data as { sold: number; coins: number; balance: number };
  revalidatePath("/", "layout");
  return { ok: true, sold: r.sold, coins: r.coins, balance: r.balance };
}
