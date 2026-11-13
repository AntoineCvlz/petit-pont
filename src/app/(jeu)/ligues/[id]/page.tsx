import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { DuelCard } from "@/components/social/DuelUI";
import { LeagueOwnerActions } from "@/components/social/LeagueUI";
import { Avatar } from "@/components/ui/Avatar";
import { Panel } from "@/components/ui/Panel";
import { requireProfile } from "@/lib/data/profile";
import { getLeagueDetail, type Duel } from "@/lib/data/social";

export const metadata: Metadata = { title: "Ligue privée" };

export default async function LeaguePage({ params }: PageProps<"/ligues/[id]">) {
  const { id } = await params;
  const [profile, league] = await Promise.all([requireProfile(), getLeagueDetail(id)]);
  if (!league) notFound();

  const rounds = new Map<number, Duel[]>();
  for (const d of league.duels) {
    const r = d.round ?? 0;
    rounds.set(r, [...(rounds.get(r) ?? []), d]);
  }
  const myTurn = league.duels.filter(
    (d) => d.status === "waiting" && ((d.homeId === profile.id && !d.homePlayed) || (d.awayId === profile.id && !d.awayPlayed)),
  );
  const winner = league.members.find((m) => m.userId === league.winnerId);

  return (
    <>
      <Link href="/ligues" className="text-sm text-chalk-muted hover:text-chalk">
        ← Ligues privées
      </Link>
      <div className="mt-3 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{league.name}</h1>
          <p className="text-sm text-chalk-muted">
            {league.status === "open" && (
              <>
                Code d&apos;invitation : <strong className="font-mono text-base text-chalk">{league.inviteCode}</strong> ·{" "}
                {league.members.length}/{league.maxMembers} joueurs
              </>
            )}
            {league.status === "running" && `${myTurn.length} match${myTurn.length > 1 ? "s" : ""} à jouer pour toi`}
            {league.status === "finished" && winner && `Terminée · 🏆 ${winner.username}`}
          </p>
        </div>
        {league.status === "open" && (
          <LeagueOwnerActions
            leagueId={league.id}
            isOwner={league.ownerId === profile.id}
            canStart={league.members.length >= 3}
          />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Panel title="Classement">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-chalk-faint uppercase">
                <tr>
                  <th className="py-1 text-left">#</th>
                  <th className="py-1 text-left">Joueur</th>
                  <th className="py-1 text-right">J</th>
                  <th className="py-1 text-right">Diff</th>
                  <th className="py-1 text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {league.members.map((m, i) => (
                  <tr key={m.userId} className={clsx(m.userId === profile.id && "bg-turf/10")}>
                    <td className="py-2 text-chalk-muted tabular-nums">{i + 1}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <Avatar name={m.username} url={m.avatarUrl} />
                        <span className="truncate font-semibold">{m.username}</span>
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{m.played}</td>
                    <td className="py-2 text-right tabular-nums">
                      {m.goalsFor - m.goalsAgainst > 0 ? "+" : ""}
                      {m.goalsFor - m.goalsAgainst}
                    </td>
                    <td className="py-2 text-right font-display font-extrabold tabular-nums">{m.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {league.status === "open" && (
            <p className="mt-3 text-xs text-chalk-faint">
              Partage le code à tes amis (page Ligues → « Rejoindre avec un code »). Le créateur lance la ligue dès 3 joueurs.
            </p>
          )}
        </Panel>

        {league.status !== "open" && (
          <div className="space-y-5">
            {myTurn.length > 0 && (
              <Panel title="À toi de jouer">
                <ul className="space-y-3">
                  {myTurn.map((d) => (
                    <li key={d.id}>
                      <DuelCard duel={d} meId={profile.id} showLeague />
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            <Panel title="Calendrier">
              <ol className="space-y-4">
                {[...rounds].map(([round, duels]) => (
                  <li key={round}>
                    <p className="mb-2 text-xs font-bold tracking-widest text-chalk-muted uppercase">Journée {round}</p>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {duels.map((d) => (
                        <li key={d.id}>
                          <DuelCard duel={d} meId={profile.id} compact />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
