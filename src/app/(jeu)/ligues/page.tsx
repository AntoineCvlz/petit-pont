import type { Metadata } from "next";
import Link from "next/link";
import { LeagueForms } from "@/components/social/LeagueUI";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { getMyLeagues } from "@/lib/data/social";

export const metadata: Metadata = { title: "Ligues privées" };

const STATUS = { open: "Inscriptions ouvertes", running: "En cours", finished: "Terminée" } as const;

export default async function LeaguesPage() {
  const leagues = await getMyLeagues();
  return (
    <>
      <PageHeader
        title="Ligues privées"
        subtitle="Un championnat aller-retour entre amis (3 à 8 joueurs), une journée par jour, avec ton onze de saison."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Mes ligues">
          {leagues.length === 0 ? (
            <p className="text-sm text-chalk-muted">
              Tu ne fais partie d&apos;aucune ligue. Crée la tienne et partage son code !
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {leagues.map((l) => (
                <li key={l.id}>
                  <Link href={`/ligues/${l.id}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-night-800/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.name}</span>
                      <span className="block text-xs text-chalk-faint">
                        {STATUS[l.status]} · {l.members}/{l.maxMembers} joueurs
                        {l.winner ? ` · vainqueur : ${l.winner}` : ""}
                      </span>
                    </span>
                    {l.toPlay > 0 && (
                      <span className="rounded-full bg-turf px-2 py-0.5 text-xs font-bold text-night-950">
                        {l.toPlay} à jouer
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Créer ou rejoindre">
          <LeagueForms />
        </Panel>
      </div>
    </>
  );
}
