import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { getTemplateCatalog, type CardTemplateView, type ClubView } from "@/lib/data/cards";
import { getClubLeagues } from "@/lib/data/draft";
import type { SbcRequirements } from "@/lib/sbc";

// -----------------------------------------------------------------------------
// Cartes du joueur (défis, onze de saison)
// -----------------------------------------------------------------------------
export type OwnedCopy = {
  instanceId: string;
  template: CardTemplateView;
  leagueCode: string | null;
  isLocked: boolean;
  copies: number; // exemplaires de cette carte possédés
};

/** Tous les exemplaires du joueur, avec la ligue de leur club et le nombre de copies de chaque carte. */
export async function getOwnedCopies(ownerId: string): Promise<OwnedCopy[]> {
  const supabase = await createClient();
  const [rows, catalog, leagues] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("card_instances")
        .select("id, template_id, is_locked, serial_number")
        .eq("owner_id", ownerId)
        .order("template_id")
        .order("serial_number", { ascending: false })
        .range(from, to),
    ),
    getTemplateCatalog(),
    getClubLeagues(),
  ]);
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.template_id, (counts.get(r.template_id) ?? 0) + 1);
  return rows.flatMap((r) => {
    const template = catalog.get(r.template_id);
    if (!template) return [];
    return [
      {
        instanceId: r.id,
        template,
        leagueCode: template.club ? (leagues.get(template.club.code)?.code ?? null) : null,
        isLocked: r.is_locked,
        copies: counts.get(r.template_id) ?? 1,
      },
    ];
  });
}

export const getReferenceNames = cache(async () => {
  const supabase = await createClient();
  const [{ data: leagues, error: e1 }, { data: nations, error: e2 }] = await Promise.all([
    supabase.from("leagues").select("code, name"),
    supabase.from("nations").select("code, name"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    leagues: Object.fromEntries(leagues.map((l) => [l.code, l.name])) as Record<string, string>,
    nations: Object.fromEntries(nations.map((n) => [n.code, n.name])) as Record<string, string>,
  };
});

export const getClubsById = cache(async (): Promise<Record<number, ClubView>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, code, name, short_name, color_primary, color_secondary, crest_url");
  if (error) throw error;
  return Object.fromEntries(
    data.map((c) => [
      c.id,
      {
        code: c.code,
        name: c.name,
        shortName: c.short_name,
        colorPrimary: c.color_primary,
        colorSecondary: c.color_secondary,
        crestUrl: c.crest_url,
      },
    ]),
  );
});

// -----------------------------------------------------------------------------
// Défis d'équipe
// -----------------------------------------------------------------------------
export type SbcChallenge = {
  id: number;
  slug: string;
  name: string;
  description: string;
  requirements: SbcRequirements;
  rewardBooster: string;
  rewardBoosterName: string;
  rewardCount: number;
  repeat: "once" | "daily" | "weekly" | "unlimited";
  available: boolean;
  completions: number;
};

export async function getSbcList(): Promise<SbcChallenge[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sbc_list");
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    requirements: c.requirements as SbcRequirements,
    rewardBooster: c.reward_booster,
    rewardBoosterName: c.reward_booster_name ?? c.reward_booster,
    rewardCount: c.reward_count,
    repeat: c.repeat as SbcChallenge["repeat"],
    available: c.available,
    completions: Number(c.completions),
  }));
}

// -----------------------------------------------------------------------------
// Missions
// -----------------------------------------------------------------------------
export type Mission = {
  id: number;
  period: "daily" | "weekly";
  title: string;
  target: number;
  tokens: number;
  link: string | null;
  progress: number;
  claimed: boolean;
};

export type MissionsStatus = {
  tokens: number;
  shop: { booster: string; name: string; cost: number }[];
  missions: Mission[];
  dailyReset: string;
  weeklyReset: string;
};

export async function getMissionsStatus(): Promise<MissionsStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("missions_status");
  if (error) throw error;
  const r = data as {
    tokens: number;
    shop: { booster: string; name: string; cost: number }[];
    missions: Mission[];
    daily_reset: string;
    weekly_reset: string;
  };
  return { tokens: r.tokens, shop: r.shop, missions: r.missions, dailyReset: r.daily_reset, weeklyReset: r.weekly_reset };
}

// -----------------------------------------------------------------------------
// Saison
// -----------------------------------------------------------------------------
export type Tactic = "pressing" | "possession" | "contre";

export type Fixture = {
  matchday: number;
  club: number | null;
  oppStrength: number;
  teamStrength: number | null;
  status: "scheduled" | "half" | "played";
  tactic1: Tactic | null;
  oppTactic1: Tactic | null;
  tactic2: Tactic | null;
  oppTactic2: Tactic | null;
  goals1: number | null;
  oppGoals1: number | null;
  goals2: number | null;
  oppGoals2: number | null;
};

export type SeasonRun = {
  id: string;
  number: number;
  tier: number;
  status: "active" | "finished" | "abandoned";
  matchday: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  rewardsGiven: number[];
  fixtures: Fixture[];
};

export type SeasonState = {
  squad: { formation: string; slots: Record<string, string> } | null;
  team: { complete: boolean; rating?: number; chemistry?: number; strength?: number; owned?: number } | null;
  run: SeasonRun | null;
  playedToday: number;
  dailyLimit: number;
  rewards: { points: number; booster: string; count: number }[];
  seasonsFinished: number;
  nextTier: number;
};

type RawFixture = {
  matchday: number;
  club: number | null;
  opp_strength: number;
  team_strength: number | null;
  status: Fixture["status"];
  tactic1: Tactic | null;
  opp_tactic1: Tactic | null;
  tactic2: Tactic | null;
  opp_tactic2: Tactic | null;
  goals1: number | null;
  opp_goals1: number | null;
  goals2: number | null;
  opp_goals2: number | null;
};

export function toSeasonState(raw: unknown): SeasonState {
  const r = raw as {
    squad: SeasonState["squad"];
    team: SeasonState["team"];
    run:
      | (Omit<SeasonRun, "goalsFor" | "goalsAgainst" | "rewardsGiven" | "fixtures"> & {
          goals_for: number;
          goals_against: number;
          rewards_given: number[];
          fixtures: RawFixture[] | null;
        })
      | null;
    played_today: number;
    daily_limit: number;
    rewards: SeasonState["rewards"];
    seasons_finished: number;
    next_tier: number;
  };
  return {
    squad: r.squad,
    team: r.team,
    run: r.run
      ? {
          id: r.run.id,
          number: r.run.number,
          tier: r.run.tier,
          status: r.run.status,
          matchday: r.run.matchday,
          points: r.run.points,
          wins: r.run.wins,
          draws: r.run.draws,
          losses: r.run.losses,
          goalsFor: r.run.goals_for,
          goalsAgainst: r.run.goals_against,
          rewardsGiven: r.run.rewards_given,
          fixtures: (r.run.fixtures ?? []).map((f) => ({
            matchday: f.matchday,
            club: f.club,
            oppStrength: Number(f.opp_strength),
            teamStrength: f.team_strength === null ? null : Number(f.team_strength),
            status: f.status,
            tactic1: f.tactic1,
            oppTactic1: f.opp_tactic1,
            tactic2: f.tactic2,
            oppTactic2: f.opp_tactic2,
            goals1: f.goals1,
            oppGoals1: f.opp_goals1,
            goals2: f.goals2,
            oppGoals2: f.opp_goals2,
          })),
        }
      : null,
    playedToday: Number(r.played_today),
    dailyLimit: r.daily_limit,
    rewards: r.rewards,
    seasonsFinished: Number(r.seasons_finished),
    nextTier: r.next_tier,
  };
}

export async function getSeasonState(): Promise<SeasonState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("season_status");
  if (error) throw error;
  return toSeasonState(data);
}
