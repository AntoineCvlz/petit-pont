"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSeasonState, type SeasonState, type Tactic } from "@/lib/data/farm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TACTICS: readonly Tactic[] = ["pressing", "possession", "contre"];

export type FarmResult = { ok: true; message: string } | { ok: false; message: string };
export type SeasonResult = { ok: true; state: SeasonState } | { ok: false; message: string };

function errorMessage(error: { code?: string; message: string }): string {
  return error.code === "P0001" ? error.message : "Action impossible, réessaie.";
}

// --- Défis d'équipe ----------------------------------------------------------------
export async function submitSbc(challengeId: number, instanceIds: string[]): Promise<FarmResult> {
  if (
    !Number.isInteger(challengeId) ||
    instanceIds.length === 0 ||
    instanceIds.length > 30 ||
    !instanceIds.every((id) => UUID.test(id))
  ) {
    return { ok: false, message: "Sélection invalide." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_sbc", { p_challenge_id: challengeId, p_instance_ids: instanceIds });
  if (error) return { ok: false, message: errorMessage(error) };
  revalidatePath("/", "layout");
  const r = data as { reward_count: number };
  return {
    ok: true,
    message: `Défi réussi ! ${r.reward_count > 1 ? `${r.reward_count} packs t'attendent` : "Un pack t'attend"} sur la page Boosters.`,
  };
}

// --- Missions et boutique ----------------------------------------------------------------
export async function claimMission(missionId: number): Promise<FarmResult> {
  if (!Number.isInteger(missionId)) return { ok: false, message: "Mission invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_mission", { p_mission_id: missionId });
  if (error) return { ok: false, message: errorMessage(error) };
  revalidatePath("/missions");
  return { ok: true, message: `Jetons récupérés. Total : ${data}.` };
}

export async function buyWithTokens(booster: string): Promise<FarmResult> {
  if (!/^[a-z0-9-]{1,40}$/.test(booster)) return { ok: false, message: "Article invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buy_with_tokens", { p_booster: booster });
  if (error) return { ok: false, message: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: `Pack ajouté à tes packs offerts (page Boosters). Jetons restants : ${data}.` };
}

// --- Saison --------------------------------------------------------------------------------
async function seasonCall(
  fn: () => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>,
): Promise<SeasonResult> {
  const { data, error } = await fn();
  if (error) return { ok: false, message: errorMessage(error) };
  revalidatePath("/saison");
  return { ok: true, state: toSeasonState(data) };
}

export async function saveSeasonSquad(formation: string, slots: Record<string, string>): Promise<SeasonResult> {
  if (!/^[0-9]{3,4}$/.test(formation) || !Object.values(slots).every((id) => UUID.test(id))) {
    return { ok: false, message: "Équipe invalide." };
  }
  const supabase = await createClient();
  return seasonCall(() => supabase.rpc("set_season_squad", { p_formation: formation, p_slots: slots }));
}

export async function startSeason(): Promise<SeasonResult> {
  const supabase = await createClient();
  return seasonCall(() => supabase.rpc("start_season"));
}

export async function playSeasonHalf(tactic: Tactic): Promise<SeasonResult> {
  if (!TACTICS.includes(tactic)) return { ok: false, message: "Tactique inconnue." };
  const supabase = await createClient();
  const r = await seasonCall(() => supabase.rpc("season_play_half", { p_tactic: tactic }));
  if (r.ok) revalidatePath("/", "layout"); // packs gagnés, notifications
  return r;
}

export async function abandonSeason(): Promise<SeasonResult> {
  const supabase = await createClient();
  return seasonCall(() => supabase.rpc("abandon_season"));
}
