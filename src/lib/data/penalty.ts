import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { getTemplateCatalog, type CardTemplateView, type ClubView } from "@/lib/data/cards";
import type { Kick } from "@/lib/penalty";

export type PenaltyMatch = {
  id: string;
  round: number;
  status: "playing" | "won" | "lost";
  clubId: number | null;
  oppShooters: number[];
  oppKeeper: number;
  playerScore: number;
  oppScore: number;
  kicks: Kick[];
};

export type PenaltyState = {
  id: string;
  status: "playing" | "won" | "lost" | "abandoned";
  round: number;
  reward: number;
  shooters: number[];
  keeper: number;
  match: PenaltyMatch | null;
};

type RawState = {
  id: string;
  status: PenaltyState["status"];
  round: number;
  reward: number;
  shooters: number[];
  keeper: number;
  match: {
    id: string;
    round: number;
    status: PenaltyMatch["status"];
    club: number | null;
    opp_shooters: number[];
    opp_keeper: number;
    player_score: number;
    opp_score: number;
    kicks: Kick[];
  } | null;
};

export function toPenaltyState(r: RawState): PenaltyState {
  return {
    id: r.id,
    status: r.status,
    round: r.round,
    reward: Number(r.reward),
    shooters: r.shooters,
    keeper: r.keeper,
    match: r.match
      ? {
          id: r.match.id,
          round: r.match.round,
          status: r.match.status,
          clubId: r.match.club,
          oppShooters: r.match.opp_shooters,
          oppKeeper: r.match.opp_keeper,
          playerScore: r.match.player_score,
          oppScore: r.match.opp_score,
          kicks: r.match.kicks,
        }
      : null,
  };
}

export type PenaltyRewards = { quart: number; demi: number; finale: number; victoire: number };

export type PenaltyStatus = {
  dailyLimit: number;
  remaining: number;
  rewards: PenaltyRewards;
  played: number;
  wins: number;
  active: PenaltyState | null;
};

export async function getPenaltyStatus(): Promise<PenaltyStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("penalty_status");
  if (error) throw error;
  const r = data as {
    daily_limit: number;
    remaining: number;
    rewards: PenaltyRewards;
    played: number;
    wins: number;
    active: RawState | null;
  };
  return {
    dailyLimit: r.daily_limit,
    remaining: r.remaining,
    rewards: r.rewards,
    played: Number(r.played),
    wins: Number(r.wins),
    active: r.active ? toPenaltyState(r.active) : null,
  };
}

/** Club adverse (nom, couleurs, écusson) d'un match. */
export async function getOpponentClub(clubId: number | null): Promise<ClubView | null> {
  if (clubId === null) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("code, name, short_name, color_primary, color_secondary, crest_url")
    .eq("id", clubId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        code: data.code,
        name: data.name,
        shortName: data.short_name,
        colorPrimary: data.color_primary,
        colorSecondary: data.color_secondary,
        crestUrl: data.crest_url,
      }
    : null;
}

export async function resolveTemplates(ids: number[]): Promise<Record<number, CardTemplateView>> {
  const catalog = await getTemplateCatalog(ids);
  const out: Record<number, CardTemplateView> = {};
  for (const id of ids) {
    const t = catalog.get(id);
    if (t) out[id] = t;
  }
  return out;
}

export type RosterCard = { instanceId: string; template: CardTemplateView };

/** Cartes du joueur utilisables : un exemplaire par carte (le premier obtenu). */
export async function getPenaltyRoster(ownerId: string): Promise<RosterCard[]> {
  const supabase = await createClient();
  const rows = await fetchAll((from, to) =>
    supabase.from("card_instances").select("id, template_id").eq("owner_id", ownerId).order("obtained_at").order("id").range(from, to),
  );
  const catalog = await getTemplateCatalog(rows.map((r) => r.template_id));
  const seen = new Set<number>();
  const roster: RosterCard[] = [];
  for (const r of rows) {
    if (seen.has(r.template_id)) continue;
    const template = catalog.get(r.template_id);
    if (!template) continue;
    seen.add(r.template_id);
    roster.push({ instanceId: r.id, template });
  }
  return roster.sort((a, b) => b.template.rating - a.template.rating);
}

export type PenaltyLeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  wins: number;
  finals: number;
  played: number;
  isMe: boolean;
};

export async function getPenaltyLeaderboard(limit = 50): Promise<PenaltyLeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("penalty_leaderboard", { p_limit: limit });
  if (error) throw error;
  return data.map((r) => ({
    rank: Number(r.rank),
    userId: r.user_id,
    username: r.username,
    avatarUrl: r.avatar_url,
    wins: Number(r.wins),
    finals: Number(r.finals),
    played: Number(r.played),
    isMe: r.is_me,
  }));
}
