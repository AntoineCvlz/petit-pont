import type { Metadata } from "next";
import { SeasonBoard } from "@/components/farm/SeasonBoard";
import { SquadBuilder, type SquadCard } from "@/components/farm/SquadBuilder";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { getFormations } from "@/lib/data/draft";
import { getClubsById, getOwnedCopies, getSeasonState } from "@/lib/data/farm";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Saison" };

export default async function SeasonPage() {
  const profile = await requireProfile();
  const [state, formations, copies, clubs] = await Promise.all([
    getSeasonState(),
    getFormations(),
    getOwnedCopies(profile.id),
    getClubsById(),
  ]);

  // Un exemplaire par carte suffit pour composer l'équipe ; on garde celui déjà aligné s'il y en a un
  const inSquad = new Set(Object.values(state.squad?.slots ?? {}));
  const byTemplate = new Map<number, SquadCard>();
  for (const c of copies) {
    const cur = byTemplate.get(c.template.id);
    if (!cur || inSquad.has(c.instanceId)) {
      byTemplate.set(c.template.id, {
        instanceId: c.instanceId,
        card: { ...c.template, leagueCode: c.leagueCode, leagueName: null },
      });
    }
  }
  const roster = [...byTemplate.values()];
  const halfTime = state.run?.status === "active" && state.run.fixtures.some((f) => f.status === "half");

  return (
    <>
      <PageHeader
        title="Saison"
        subtitle={`10 journées avec ton onze, une tactique par mi-temps, ${state.dailyLimit} matchs par jour. Les paliers de points rapportent des packs.`}
      />
      <div className="space-y-5">
        <Panel title="Championnat">
          <SeasonBoard
            key={`${state.run?.id ?? "none"}-${state.run?.matchday ?? 0}-${state.team?.complete ?? false}-${state.team?.strength ?? 0}`}
            initial={state}
            clubs={clubs}
          />
        </Panel>
        <Panel title="Ton onze">
          {roster.length < 11 ? (
            <p className="text-sm text-chalk-muted">
              Il te faut au moins 11 cartes de footballeurs différents. Ouvre des boosters !
            </p>
          ) : (
            <SquadBuilder formations={formations} roster={roster} initial={state.squad} locked={halfTime} />
          )}
        </Panel>
      </div>
    </>
  );
}
