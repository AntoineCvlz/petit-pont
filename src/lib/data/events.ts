import "server-only";
import { TEMPLATE_SELECT, toTemplateView, type CardTemplateView } from "@/lib/data/cards";
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

export type EventWithCards = ActiveEvent & { startsAt: string; active: boolean; templates: CardTemplateView[] };

/** Événements récents (en cours puis passés) avec leurs cartes, pour la page Événements. */
export async function getEventsWithCards(limit = 8): Promise<EventWithCards[]> {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("game_events")
    .select("id, kind, name, tagline, color, starts_at, ends_at, boosters ( slug )")
    .order("starts_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (events.length === 0) return [];
  const { data: rows, error: cardsError } = await supabase
    .from("card_templates")
    .select(`event_id, ${TEMPLATE_SELECT}`)
    .in(
      "event_id",
      events.map((e) => e.id),
    )
    .order("rating", { ascending: false });
  if (cardsError) throw cardsError;
  const now = Date.now();
  return events.map((e) => {
    const templates = rows.filter((r) => r.event_id === e.id).map((r) => toTemplateView(r as never));
    return {
      id: e.id,
      kind: e.kind as ActiveEvent["kind"],
      name: e.name,
      tagline: e.tagline,
      color: e.color,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      active: new Date(e.ends_at).getTime() > now,
      boosterSlug: e.boosters?.slug ?? null,
      cards: templates.length,
      templates,
    };
  });
}
