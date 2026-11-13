import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { ChallengeForm, DuelCard } from "@/components/social/DuelUI";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { getSeasonState } from "@/lib/data/farm";
import { requireProfile } from "@/lib/data/profile";
import { getEloLeaderboard, getMyDuels } from "@/lib/data/social";

export const metadata: Metadata = { title: "Matchs amicaux" };

export default async function MatchsPage({ searchParams }: PageProps<"/matchs">) {
  const { adversaire } = await searchParams;
  const profile = await requireProfile();
  const [duels, leaderboard, season] = await Promise.all([getMyDuels(), getEloLeaderboard(50), getSeasonState()]);
  const me = leaderboard.find((r) => r.isMe);
  const waiting = duels.filter((d) => d.status === "waiting");
  const done = duels.filter((d) => d.status !== "waiting");

  return (
    <>
      <PageHeader
        title="Matchs amicaux"
        subtitle="Défie un autre joueur avec ton onze de saison : chacun choisit ses tactiques quand il veut, le match se joue dès que les deux ont répondu (48 h max)."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel title="Nouveau défi">
            <ChallengeForm
              initialOpponent={typeof adversaire === "string" ? adversaire : ""}
              hasSquad={Boolean(season.team?.complete)}
            />
          </Panel>
          <Panel title={`En cours (${waiting.length})`}>
            {waiting.length === 0 ? (
              <p className="text-sm text-chalk-muted">Aucun défi en attente.</p>
            ) : (
              <ul className="space-y-3">
                {waiting.map((d) => (
                  <li key={d.id}>
                    <DuelCard duel={d} meId={profile.id} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {done.length > 0 && (
            <Panel title="Derniers matchs">
              <ul className="space-y-3">
                {done.map((d) => (
                  <li key={d.id}>
                    <DuelCard duel={d} meId={profile.id} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <Panel title="Classement Elo">
          <p className="mb-3 text-sm text-chalk-muted">
            Ton Elo : <strong className="text-chalk">{me?.elo ?? 1000}</strong>
            {me ? ` (${me.rank}e)` : " · joue un premier match pour être classé"}
          </p>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-chalk-muted">Aucun match joué pour l&apos;instant.</p>
          ) : (
            <ol className="divide-y divide-line">
              {leaderboard.map((r) => (
                <li key={r.userId} className={clsx("flex items-center gap-3 px-1 py-2", r.isMe && "bg-turf/10")}>
                  <span className="w-6 text-right font-display text-sm font-bold text-chalk-muted tabular-nums">{r.rank}</span>
                  <Avatar name={r.username} url={r.avatarUrl} />
                  <Link
                    href={`/joueurs/${encodeURIComponent(r.username)}`}
                    className="min-w-0 flex-1 truncate font-semibold hover:underline"
                  >
                    {r.username}
                  </Link>
                  <span className="text-xs text-chalk-faint">{r.played} m.</span>
                  <span className="font-display font-extrabold text-turf tabular-nums">{r.elo}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
