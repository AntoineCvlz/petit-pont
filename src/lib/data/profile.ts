import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";

export type CurrentProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  coins: number;
  isDemo: boolean;
  isAdmin: boolean;
  hideActivity: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
  createdAt: string;
  bannedAt: string | null;
  banReason: string | null;
};

/** Profil du joueur connecté (mémoïsé pour la requête en cours). */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, coins, is_demo, is_admin, hide_activity, sound_enabled, reduced_motion, created_at, banned_at, ban_reason")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url,
    coins: data.coins,
    isDemo: data.is_demo,
    isAdmin: data.is_admin,
    hideActivity: data.hide_activity,
    soundEnabled: data.sound_enabled,
    reducedMotion: data.reduced_motion,
    createdAt: data.created_at,
    bannedAt: data.banned_at,
    banReason: data.ban_reason,
  };
});

/** Comme getCurrentProfile, mais renvoie vers la connexion si absent. */
export async function requireProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/connexion");
  if (profile.bannedAt) redirect("/suspendu");
  return profile;
}

export type CollectionStats = { totalCopies: number; distinctCards: number };

export async function getCollectionStats(ownerId: string): Promise<CollectionStats> {
  const supabase = await createClient();
  const data = await fetchAll((from, to) =>
    supabase.from("card_instances").select("id, template_id").eq("owner_id", ownerId).order("id").range(from, to),
  );
  return { totalCopies: data.length, distinctCards: new Set(data.map((r) => r.template_id)).size };
}
