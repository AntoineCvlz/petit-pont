"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toPenaltyState, type PenaltyState } from "@/lib/data/penalty";
import { DIRECTIONS, type Direction, type KickResult } from "@/lib/penalty";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type LastKick = {
  side: "player" | "opponent";
  shooter: number;
  direction: Direction;
  dive: Direction;
  result: KickResult;
  matchOver: boolean;
  winner: "player" | "opponent" | null;
  matchRound: number;
  playerScore: number;
  oppScore: number;
};

export type PenaltyResult = { ok: true; state: PenaltyState; lastKick?: LastKick } | { ok: false; message: string };

function fail(error: { code?: string; message: string }): PenaltyResult {
  return { ok: false, message: error.code === "P0001" ? error.message : "Action impossible, réessaie." };
}

/** Inscription au tournoi : 5 tireurs et 1 gardien de sa collection (vérifiés par la base). */
export async function startPenalty(shooterIds: string[], keeperId: string): Promise<PenaltyResult> {
  if (shooterIds.length !== 5 || ![...shooterIds, keeperId].every((id) => UUID.test(id))) {
    return { ok: false, message: "Choisis 5 tireurs et un gardien." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_penalty_tournament", { p_shooters: shooterIds, p_keeper: keeperId });
  if (error) return fail(error);
  revalidatePath("/penalty");
  return { ok: true, state: toPenaltyState(data as never) };
}

/** Un tir : le client n'envoie que la direction (tir ou plongeon). Tout le reste est tiré par la base. */
export async function kickPenalty(tournamentId: string, direction: Direction): Promise<PenaltyResult> {
  if (!UUID.test(tournamentId) || !DIRECTIONS.includes(direction)) return { ok: false, message: "Tir invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("penalty_kick", { p_tournament_id: tournamentId, p_direction: direction });
  if (error) return fail(error);
  const raw = data as Parameters<typeof toPenaltyState>[0] & {
    last_kick: {
      side: LastKick["side"];
      shooter: number;
      direction: Direction;
      dive: Direction;
      result: KickResult;
      match_over: boolean;
      winner: LastKick["winner"];
      match_round: number;
      player_score: number;
      opp_score: number;
    };
  };
  const k = raw.last_kick;
  const state = toPenaltyState(raw);
  if (state.status !== "playing") revalidatePath("/", "layout"); // solde (récompense)
  return {
    ok: true,
    state,
    lastKick: {
      side: k.side,
      shooter: k.shooter,
      direction: k.direction,
      dive: k.dive,
      result: k.result,
      matchOver: k.match_over,
      winner: k.winner,
      matchRound: k.match_round,
      playerScore: k.player_score,
      oppScore: k.opp_score,
    },
  };
}

/** Abandon : le match en cours est perdu, la récompense du tour atteint est versée. */
export async function abandonPenalty(tournamentId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!UUID.test(tournamentId)) return { ok: false, message: "Tournoi introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("abandon_penalty_tournament", { p_tournament_id: tournamentId });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Action impossible, réessaie." };
  revalidatePath("/", "layout");
  return { ok: true };
}
