import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ActiveEvent = {
  id: number;
  kind: "weekly" | "totw";
  name: string;
  tagline: string | null;
  color: string;
  endsAt: string;
  boosterSlug: string | null;
  cards: number;
};

/** Événements en cours (vendredi, équipe de la semaine), le plus récent d'abord. */
export async function getActiveEvents(): Promise<ActiveEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_events")
    .select("id, kind, name, tagline, color, ends_at, boosters ( slug ), card_templates ( id )")
    .gt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(4);
  if (error) throw error;
  return data.map((e) => ({
    id: e.id,
    kind: e.kind as ActiveEvent["kind"],
    name: e.name,
    tagline: e.tagline,
    color: e.color,
    endsAt: e.ends_at,
    boosterSlug: e.boosters?.slug ?? null,
    cards: e.card_templates?.length ?? 0,
  }));
}
