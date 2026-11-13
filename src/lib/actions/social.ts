"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import type { Tactic } from "@/lib/data/farm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TACTICS: readonly Tactic[] = ["pressing", "possession", "contre"];

export type SocialResult = { ok: true; message: string; id?: string } | { ok: false; message: string };

function fail(error: { code?: string; message: string }): SocialResult {
  return { ok: false, message: error.code === "P0001" ? error.message : "Action impossible, réessaie." };
}

function validTactics(t: Tactic[]): boolean {
  return t.length === 2 && t.every((x) => TACTICS.includes(x));
}

// --- Matchs ---------------------------------------------------------------------------
export async function challengePlayer(username: string, tactics: Tactic[]): Promise<SocialResult> {
  if (!validTactics(tactics)) return { ok: false, message: "Choisis une tactique par mi-temps." };
  const name = username.trim();
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(name)) return { ok: false, message: "Pseudo invalide." };
  const supabase = await createClient();
  const { data: target, error: findError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", name.replace(/_/g, "\\_"))
    .maybeSingle();
  if (findError) return { ok: false, message: "Recherche impossible." };
  if (!target) return { ok: false, message: "Aucun joueur avec ce pseudo." };
  const { error } = await supabase.rpc("challenge_player", { p_opponent: target.id, p_tactics: tactics });
  if (error) return fail(error);
  revalidatePath("/matchs");
  return { ok: true, message: `Défi envoyé à ${name}. Résultat dès qu'il aura choisi ses tactiques.` };
}

export async function playDuel(duelId: string, tactics: Tactic[]): Promise<SocialResult> {
  if (!UUID.test(duelId) || !validTactics(tactics)) return { ok: false, message: "Choix invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("play_duel", { p_duel: duelId, p_tactics: tactics });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  const d = data as { status: string } | null;
  return { ok: true, message: d?.status === "played" ? "Match joué !" : "Tactiques enregistrées : en attente de l'adversaire." };
}

export async function declineDuel(duelId: string): Promise<SocialResult> {
  if (!UUID.test(duelId)) return { ok: false, message: "Défi introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_duel", { p_duel: duelId });
  if (error) return fail(error);
  revalidatePath("/matchs");
  return { ok: true, message: "Défi retiré." };
}

// --- Ligues ----------------------------------------------------------------------------
export async function createLeague(name: string): Promise<SocialResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_league", { p_name: name });
  if (error) return fail(error);
  revalidatePath("/ligues");
  return { ok: true, message: "Ligue créée.", id: data as string };
}

export async function joinLeague(code: string): Promise<SocialResult> {
  if (!/^[A-Za-z0-9]{4,10}$/.test(code.trim())) return { ok: false, message: "Code invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_league", { p_code: code.trim() });
  if (error) return fail(error);
  revalidatePath("/ligues");
  return { ok: true, message: "Bienvenue dans la ligue !", id: data as string };
}

export async function leaveLeague(id: string): Promise<SocialResult> {
  if (!UUID.test(id)) return { ok: false, message: "Ligue introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_league", { p_league: id });
  if (error) return fail(error);
  revalidatePath("/ligues");
  return { ok: true, message: "Tu as quitté la ligue." };
}

export async function startLeague(id: string): Promise<SocialResult> {
  if (!UUID.test(id)) return { ok: false, message: "Ligue introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_league", { p_league: id });
  if (error) return fail(error);
  revalidatePath(`/ligues/${id}`);
  return { ok: true, message: "C'est parti ! Le calendrier est en ligne." };
}

// --- Clans -----------------------------------------------------------------------------
export async function createClan(name: string, tag: string, description: string, isOpen: boolean): Promise<SocialResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_clan", {
    p_name: name,
    p_tag: tag,
    p_description: description,
    p_open: isOpen,
  });
  if (error) return fail(error);
  revalidatePath("/clans");
  return { ok: true, message: "Clan créé.", id: data as string };
}

export async function joinClan(clanId: string | null, code: string | null): Promise<SocialResult> {
  if (clanId !== null && !UUID.test(clanId)) return { ok: false, message: "Clan introuvable." };
  const supabase = await createClient();
  // Par code : l'identifiant est ignoré par la RPC
  const { data, error } = await supabase.rpc("join_clan", {
    p_clan: clanId ?? "00000000-0000-0000-0000-000000000000",
    p_code: code ?? undefined,
  });
  if (error) return fail(error);
  revalidatePath("/clans");
  return { ok: true, message: "Bienvenue dans le clan !", id: data as string };
}

export async function leaveClan(): Promise<SocialResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_clan");
  if (error) return fail(error);
  revalidatePath("/clans");
  return { ok: true, message: "Tu as quitté le clan." };
}

export async function kickClanMember(userId: string): Promise<SocialResult> {
  if (!UUID.test(userId)) return { ok: false, message: "Membre introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("kick_clan_member", { p_user: userId });
  if (error) return fail(error);
  revalidatePath("/clans");
  return { ok: true, message: "Membre retiré." };
}

export async function updateClan(description: string, isOpen: boolean): Promise<SocialResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_clan", { p_description: description, p_open: isOpen });
  if (error) return fail(error);
  revalidatePath("/clans");
  return { ok: true, message: "Clan mis à jour." };
}

export async function postClanMessage(body: string): Promise<SocialResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_clan_message", { p_body: body });
  if (error) return fail(error);
  return { ok: true, message: "" };
}

export async function deleteClanMessage(id: number): Promise<SocialResult> {
  if (!Number.isInteger(id)) return { ok: false, message: "Message introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_clan_message", { p_message: id });
  if (error) return fail(error);
  revalidatePath("/clans");
  return { ok: true, message: "Message supprimé." };
}

// --- Admin : Discord ------------------------------------------------------------------------
export async function saveDiscordWebhook(_prev: SocialResult | null, fd: FormData): Promise<SocialResult> {
  const profile = await getCurrentProfile();
  if (!profile?.isAdmin) return { ok: false, message: "Réservé aux administrateurs." };
  const url = String(fd.get("webhook") ?? "").trim();
  const site = String(fd.get("site_url") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_discord_webhook", { p_url: url, p_site_url: site || undefined });
  if (error) return fail(error);
  revalidatePath("/admin");
  return {
    ok: true,
    message: url ? "Webhook enregistré : les annonces partiront dans ton salon." : "Annonces Discord désactivées.",
  };
}
