import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import type { CardTemplateView } from "@/lib/data/cards";
import { getCollectionTotal } from "@/lib/data/cards";
import { getEventsWithCards, type EventWithCards } from "@/lib/data/events";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Événements" };

/** Équipe de la semaine sur un terrain (4-3-3), avec la raison de chaque sélection. */
function TotwPitch({ cards, total }: { cards: CardTemplateView[]; total: number }) {
  const lines: CardTemplateView["position"][] = ["ATT", "MIL", "DEF", "GB"];
  return (
    <div
      className="space-y-4 rounded-xl border border-white/10 p-3 sm:p-5"
      style={{ background: "repeating-linear-gradient(0deg, #1d5a35 0 10%, #1a5230 10% 20%)" }}
    >
      {lines.map((pos) => (
        <ul key={pos} className="flex flex-wrap justify-center gap-2 sm:gap-4">
          {cards
            .filter((c) => c.position === pos)
            .map((c) => (
              <li key={c.id} className="flex flex-col items-center gap-1">
                <Card template={c} collectionTotal={total} size="sm" />
                {c.eventNote && (
                  <span className="max-w-[140px] rounded-md bg-night-950/80 px-2 py-0.5 text-center text-[11px] font-semibold text-r-legendaire">
                    {c.eventNote}
                  </span>
                )}
              </li>
            ))}
        </ul>
      ))}
    </div>
  );
}

function EventSection({ e, total }: { e: EventWithCards; total: number }) {
  return (
    <section
      id={`evenement-${e.id}`}
      aria-labelledby={`evenement-${e.id}-titre`}
      className="scroll-mt-20 overflow-hidden rounded-2xl border p-4 sm:p-6"
      style={{
        borderColor: `color-mix(in srgb, ${e.color} 45%, transparent)`,
        background: `linear-gradient(160deg, color-mix(in srgb, ${e.color} 18%, #0d1813), #0d1813 45%)`,
      }}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xs font-bold tracking-widest uppercase" style={{ color: e.color }}>
            {e.kind === "totw" ? "Équipe de la semaine" : "Événement du vendredi"}
            {e.active ? " · en cours" : ""}
          </p>
          <h2
            id={`evenement-${e.id}-titre`}
            className="font-display text-2xl leading-tight font-extrabold tracking-wide uppercase italic sm:text-3xl"
          >
            {e.name}
          </h2>
          {e.tagline && <p className="text-sm text-chalk-muted">{e.tagline}</p>}
          <p className="mt-1 text-xs text-chalk-faint">
            {e.cards} cartes boostées · du {formatDate(e.startsAt)} au {formatDate(e.endsAt)}
          </p>
        </div>
        {e.active && e.boosterSlug && (
          <Link href={`/boosters/${e.boosterSlug}`} className={buttonClasses("primary", "md")}>
            Ouvrir le booster
          </Link>
        )}
      </div>
      {e.kind === "totw" ? (
        <TotwPitch cards={e.templates} total={total} />
      ) : (
        <ul className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {e.templates.map((c) => (
            <li key={c.id}>
              <Card template={c} collectionTotal={total} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function EventsPage() {
  const [events, total] = await Promise.all([getEventsWithCards(10), getCollectionTotal()]);
  const active = events.filter((e) => e.active);
  const past = events.filter((e) => !e.active);

  return (
    <>
      <PageHeader
        title="Événements"
        subtitle="Chaque vendredi 19h, un événement à thème. Chaque mercredi 19h, l'équipe de la semaine d'après les vrais matchs."
      />
      {events.length === 0 ? (
        <EmptyState title="Aucun événement pour l'instant">
          Le premier événement arrive vendredi à 19h, l&apos;équipe de la semaine mercredi à 19h.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {active.map((e) => (
            <EventSection key={e.id} e={e} total={total} />
          ))}
          {past.length > 0 && (
            <>
              <h2 className="pt-2 font-display text-sm font-bold tracking-widest text-chalk-muted uppercase">
                Éditions précédentes
              </h2>
              {past.map((e) => (
                <EventSection key={e.id} e={e} total={total} />
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
