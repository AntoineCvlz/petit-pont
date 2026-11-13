import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tactic } from "@/lib/data/farm";

// -----------------------------------------------------------------------------
// Matchs (amicaux et de ligue)
// -----------------------------------------------------------------------------
export type Duel = {
  id: string;
  kind: "friendly" | "league";
  leagueId: string | null;
  round: number | null;
  status: "waiting" | "played" | "declined" | "expired" | "cancelled";
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  homeAvatar: string | null;
  awayAvatar: string | null;
  homePlayed: boolean;
  awayPlayed: boolean;
  homeTactics: Tactic[] | null;
  awayTactics: Tactic[] | null;
  homeStrength: number | null;
  awayStrength: number | null;
  homeGoals: number[] | null;
  awayGoals: number[] | null;
  homeEloDelta: number | null;
  awayEloDelta: number | null;
  deadline: string;
  createdAt: string;
  playedAt: string | null;
};

type RawDuel = {
  id: string;
  kind: Duel["kind"];
  league_id: string | null;
  round: number | null;
  status: Duel["status"];
  home_id: string;
  away_id: string;
  home_name: string;
  away_name: string;
  home_avatar: string | null;
  away_avatar: string | null;
  home_played: boolean;
  away_played: boolean;
  home_tactics: Tactic[] | null;
  away_tactics: Tactic[] | null;
  home_strength: number | null;
  away_strength: number | null;
  home_goals: number[] | null;
  away_goals: number[] | null;
  home_elo_delta: number | null;
  away_elo_delta: number | null;
  deadline: string;
  created_at: string;
  played_at: string | null;
};

export function toDuel(r: RawDuel): Duel {
  return {
    id: r.id,
    kind: r.kind,
    leagueId: r.league_id,
    round: r.round,
    status: r.status,
    homeId: r.home_id,
    awayId: r.away_id,
    homeName: r.home_name,
    awayName: r.away_name,
    homeAvatar: r.home_avatar,
    awayAvatar: r.away_avatar,
    homePlayed: r.home_played,
    awayPlayed: r.away_played,
    homeTactics: r.home_tactics,
    awayTactics: r.away_tactics,
    homeStrength: r.home_strength === null ? null : Number(r.home_strength),
    awayStrength: r.away_strength === null ? null : Number(r.away_strength),
    homeGoals: r.home_goals,
    awayGoals: r.away_goals,
    homeEloDelta: r.home_elo_delta,
    awayEloDelta: r.away_elo_delta,
    deadline: r.deadline,
    createdAt: r.created_at,
    playedAt: r.played_at,
  };
}

export async function getMyDuels(): Promise<Duel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_duels", { p_limit: 40 });
  if (error) throw error;
  return (data as RawDuel[]).map(toDuel);
}

export type EloRow = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  elo: number;
  played: number;
  isMe: boolean;
};

export async function getEloLeaderboard(limit = 50): Promise<EloRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("elo_leaderboard", { p_limit: limit });
  if (error) throw error;
  return data.map((r) => ({
    rank: Number(r.rank),
    userId: r.user_id,
    username: r.username,
    avatarUrl: r.avatar_url,
    elo: r.elo,
    played: Number(r.played),
    isMe: r.is_me,
  }));
}

// -----------------------------------------------------------------------------
// Ligues privées
// -----------------------------------------------------------------------------
export type LeagueSummary = {
  id: string;
  name: string;
  status: "open" | "running" | "finished";
  members: number;
  maxMembers: number;
  winner: string | null;
  toPlay: number;
};

export async function getMyLeagues(): Promise<LeagueSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_leagues");
  if (error) throw error;
  return (
    data as {
      id: string;
      name: string;
      status: LeagueSummary["status"];
      members: number;
      max_members: number;
      winner: string | null;
      to_play: number;
    }[]
  ).map((l) => ({
    id: l.id,
    name: l.name,
    status: l.status,
    members: Number(l.members),
    maxMembers: l.max_members,
    winner: l.winner,
    toPlay: Number(l.to_play),
  }));
}

export type LeagueStanding = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type LeagueDetail = {
  id: string;
  name: string;
  ownerId: string;
  status: LeagueSummary["status"];
  maxMembers: number;
  inviteCode: string;
  startedAt: string | null;
  finishedAt: string | null;
  winnerId: string | null;
  members: LeagueStanding[];
  duels: Duel[];
};

export async function getLeagueDetail(id: string): Promise<LeagueDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("league_detail", { p_league: id });
  if (error) throw error;
  if (!data) return null;
  const r = data as {
    id: string;
    name: string;
    owner_id: string;
    status: LeagueSummary["status"];
    max_members: number;
    invite_code: string;
    started_at: string | null;
    finished_at: string | null;
    winner_id: string | null;
    members: {
      user_id: string;
      username: string;
      avatar_url: string | null;
      points: number;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goals_for: number;
      goals_against: number;
    }[];
    duels: RawDuel[];
  };
  return {
    id: r.id,
    name: r.name,
    ownerId: r.owner_id,
    status: r.status,
    maxMembers: r.max_members,
    inviteCode: r.invite_code,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    winnerId: r.winner_id,
    members: r.members.map((m) => ({
      userId: m.user_id,
      username: m.username,
      avatarUrl: m.avatar_url,
      points: m.points,
      played: m.played,
      wins: m.wins,
      draws: m.draws,
      losses: m.losses,
      goalsFor: m.goals_for,
      goalsAgainst: m.goals_against,
    })),
    duels: r.duels.map(toDuel),
  };
}

// -----------------------------------------------------------------------------
// Clans
// -----------------------------------------------------------------------------
export type ClanSummary = {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  isOpen: boolean;
  goalsCompleted: number;
  members: number;
};

export async function getClanList(): Promise<ClanSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clan_list", { p_limit: 100 });
  if (error) throw error;
  return (
    data as {
      id: string;
      name: string;
      tag: string;
      description: string | null;
      is_open: boolean;
      goals_completed: number;
      members: number;
    }[]
  ).map((c) => ({
    id: c.id,
    name: c.name,
    tag: c.tag,
    description: c.description,
    isOpen: c.is_open,
    goalsCompleted: Number(c.goals_completed),
    members: Number(c.members),
  }));
}

export async function getMyClanId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clan_members").select("clan_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.clan_id ?? null;
}

export type ClanDetail = ClanSummary & {
  ownerId: string;
  isMember: boolean;
  inviteCode: string | null;
  memberList: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    role: "owner" | "member";
    contribution: number | null;
  }[];
  goal: { title: string; event: string; target: number; progress: number; completed: boolean; weekStart: string } | null;
};

export async function getClanDetail(id: string): Promise<ClanDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clan_detail", { p_clan: id });
  if (error) throw error;
  if (!data) return null;
  const r = data as {
    id: string;
    name: string;
    tag: string;
    description: string | null;
    owner_id: string;
    is_open: boolean;
    goals_completed: number;
    is_member: boolean;
    invite_code: string | null;
    members: {
      user_id: string;
      username: string;
      avatar_url: string | null;
      role: "owner" | "member";
      contribution: number | null;
    }[];
    goal: { title: string; event: string; target: number; progress: number; completed: boolean; week_start: string } | null;
  };
  return {
    id: r.id,
    name: r.name,
    tag: r.tag,
    description: r.description,
    isOpen: r.is_open,
    goalsCompleted: r.goals_completed,
    members: r.members.length,
    ownerId: r.owner_id,
    isMember: r.is_member,
    inviteCode: r.invite_code,
    memberList: r.members.map((m) => ({
      userId: m.user_id,
      username: m.username,
      avatarUrl: m.avatar_url,
      role: m.role,
      contribution: m.contribution,
    })),
    goal: r.goal
      ? {
          title: r.goal.title,
          event: r.goal.event,
          target: r.goal.target,
          progress: r.goal.progress,
          completed: r.goal.completed,
          weekStart: r.goal.week_start,
        }
      : null,
  };
}

export type ClanMessage = {
  id: number;
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
};

export async function getClanMessages(clanId: string, limit = 60): Promise<ClanMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clan_messages")
    .select("id, user_id, body, created_at, profiles ( username, avatar_url )")
    .eq("clan_id", clanId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data
    .map((m) => ({
      id: m.id,
      userId: m.user_id,
      username: m.profiles?.username ?? null,
      avatarUrl: m.profiles?.avatar_url ?? null,
      body: m.body,
      createdAt: m.created_at,
    }))
    .reverse();
}

export async function getDiscordStatus(): Promise<{ configured: boolean; updatedAt: string | null; siteUrl: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_discord_status");
  if (error) throw error;
  if (!data) return null;
  const r = data as { configured: boolean; updated_at: string | null; site_url: string | null };
  return { configured: r.configured, updatedAt: r.updated_at, siteUrl: r.site_url ?? "" };
}
