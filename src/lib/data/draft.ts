import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTemplateCatalog, type CardTemplateView } from "@/lib/data/cards";
import type { DraftFormation, LinkIdentity } from "@/lib/draft";

export type DraftState = {
  id: string;
  formation: string;
  status: "picking" | "completed" | "abandoned";
  currentSlot: number;
  offer: number[];
  rating: number | null;
  chemistry: number | null;
  score: number | null;
  picks: Record<string, number>;
};

type RawState = {
  id: string;
  formation: string;
  status: DraftState["status"];
  current_slot: number;
  offer: number[];
  rating: number | null;
  chemistry: number | null;
  score: number | null;
  picks: Record<string, number>;
};

export function toDraftState(r: RawState): DraftState {
  return {
    id: r.id,
    formation: r.formation,
    status: r.status,
    currentSlot: r.current_slot,
    offer: r.offer,
    rating: r.rating === null ? null : Number(r.rating),
    chemistry: r.chemistry,
    score: r.score === null ? null : Number(r.score),
    picks: r.picks,
  };
}

export type DraftStatus = {
  dailyLimit: number;
  remaining: number;
  active: DraftState | null;
  best: { id: string; score: number; rating: number; chemistry: number } | null;
};

export async function getDraftStatus(): Promise<DraftStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("draft_status");
  if (error) throw error;
  const r = data as {
    daily_limit: number;
    remaining: number;
    active: RawState | null;
    best: {
      id: string;
      score: number;
      rating: number;
      chemistry: number;
    } | null;
  };
  return {
    dailyLimit: r.daily_limit,
    remaining: r.remaining,
    active: r.active ? toDraftState(r.active) : null,
    best: r.best
      ? {
          ...r.best,
          score: Number(r.best.score),
          rating: Number(r.best.rating),
        }
      : null,
  };
}

export const getFormations = cache(async (): Promise<DraftFormation[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("draft_formations").select("code, name, slots, links").order("sort_order");
  if (error) throw error;
  return data as unknown as DraftFormation[];
});

/** Club → ligue (code et nom), pour le collectif et l'affichage. */
export const getClubLeagues = cache(async (): Promise<Map<string, { code: string; name: string }>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clubs").select("code, leagues ( code, short_name )");
  if (error) throw error;
  return new Map(data.filter((c) => c.leagues).map((c) => [c.code, { code: c.leagues!.code, name: c.leagues!.short_name }]));
});

export type DraftCard = CardTemplateView & {
  leagueCode: string | null;
  leagueName: string | null;
};

export function linkIdentity(c: DraftCard): LinkIdentity {
  return {
    club: c.club?.code ?? null,
    league: c.leagueCode,
    nation: c.nation.code,
  };
}

/** Résout des identifiants de cartes en cartes affichables (avec ligue). */
export async function resolveDraftCards(ids: number[]): Promise<Map<number, DraftCard>> {
  const [catalog, leagues] = await Promise.all([getTemplateCatalog(ids), getClubLeagues()]);
  const out = new Map<number, DraftCard>();
  for (const id of ids) {
    const t = catalog.get(id);
    if (!t) continue;
    const l = t.club ? leagues.get(t.club.code) : undefined;
    out.set(id, {
      ...t,
      leagueCode: l?.code ?? null,
      leagueName: l?.name ?? null,
    });
  }
  return out;
}

export type CompletedDraft = {
  id: string;
  userId: string;
  username: string;
  formation: DraftFormation;
  rating: number;
  chemistry: number;
  score: number;
  completedAt: string;
  picks: Record<string, DraftCard>;
};

export async function getCompletedDraft(id: string): Promise<CompletedDraft | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drafts")
    .select(
      "id, user_id, formation, rating, chemistry, score, completed_at, profiles!inner ( username ), draft_picks ( slot_key, template_id )",
    )
    .eq("id", id)
    .eq("status", "completed")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [formations, cards] = await Promise.all([getFormations(), resolveDraftCards(data.draft_picks.map((p) => p.template_id))]);
  const formation = formations.find((f) => f.code === data.formation);
  if (!formation) return null;
  const picks: Record<string, DraftCard> = {};
  for (const p of data.draft_picks) {
    const c = cards.get(p.template_id);
    if (c) picks[p.slot_key] = c;
  }
  return {
    id: data.id,
    userId: data.user_id,
    username: data.profiles.username,
    formation,
    rating: Number(data.rating),
    chemistry: data.chemistry ?? 0,
    score: Number(data.score),
    completedAt: data.completed_at!,
    picks,
  };
}

export type DraftLeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  draftId: string;
  score: number;
  rating: number;
  chemistry: number;
  formation: string;
  completedAt: string;
  isMe: boolean;
};

export async function getDraftLeaderboard(limit = 50): Promise<DraftLeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("draft_leaderboard", {
    p_limit: limit,
  });
  if (error) throw error;
  return data.map((r) => ({
    rank: Number(r.rank),
    userId: r.user_id,
    username: r.username,
    avatarUrl: r.avatar_url,
    draftId: r.draft_id,
    score: Number(r.score),
    rating: Number(r.rating),
    chemistry: r.chemistry,
    formation: r.formation,
    completedAt: r.completed_at,
    isMe: r.is_me,
  }));
}
