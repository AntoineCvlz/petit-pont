import type { Metadata } from "next";
import { clsx } from "clsx";
import { PenaltyGame } from "@/components/penalty/PenaltyGame";
import { PenaltySetup } from "@/components/penalty/PenaltySetup";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Panel } from "@/components/ui/Panel";
import {
  getOpponentClub,
  getPenaltyLeaderboard,
  getPenaltyRoster,
  getPenaltyStatus,
  resolveTemplates,
  type PenaltyLeaderboardRow,
  type PenaltyRewards,
} from "@/lib/data/penalty";
import { requireProfile } from "@/lib/data/profile";
import { formatCoins } from "@/lib/format";

export const metadata: Metadata = { title: "Tirs au but" };

function Rewards({ rewards }: { rewards: PenaltyRewards }) {
  const rows: [string, number][] = [
    ["Éliminé en quart", rewards.quart],
    ["Éliminé en demi-finale", rewards.demi],
    ["Finaliste", rewards.finale],
    ["Vainqueur", rewards.victoire],
  ];
  return (
    <ul className="space-y-1 text-sm">
      {rows.map(([label, coins]) => (
        <li key={label} className="flex justify-between gap-3">
          <span className="text-chalk-muted">{label}</span>
          <span className="font-semibold tabular-nums">{coins > 0 ? `${formatCoins(coins)} pièces` : "—"}</span>
        </li>
      ))}
    </ul>
  );
}

function Leaderboard({ rows }: { rows: PenaltyLeaderboardRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-chalk-muted">Aucun finaliste pour l&apos;instant.</p>;
  return (
    <ol className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.userId} className={clsx("flex items-center gap-3 px-1 py-2", r.isMe && "bg-turf/10")}>
          <span className="w-7 text-right font-display text-sm font-bold text-chalk-muted tabular-nums">{r.rank}</span>
          <Avatar name={r.username} url={r.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{r.username}</span>
            <span className="block text-xs text-chalk-faint">
              {r.finals} finale{r.finals > 1 ? "s" : ""} · {r.played} tournoi{r.played > 1 ? "s" : ""}
            </span>
          </span>
          <span className="font-display text-lg font-extrabold text-turf tabular-nums" title="Tournois gagnés">
            {r.wins} 🏆
          </span>
        </li>
      ))}
    </ol>
  );
}

export default async function PenaltyPage() {
  const profile = await requireProfile();
  const [status, leaderboard] = await Promise.all([getPenaltyStatus(), getPenaltyLeaderboard(50)]);
  const active = status.active;
  const plural = status.remaining > 1 ? "s" : "";

  let game = null;
  if (active?.match) {
    const m = active.match;
    const [cards, opponent] = await Promise.all([
      resolveTemplates([...active.shooters, active.keeper, ...m.oppShooters, m.oppKeeper]),
      getOpponentClub(m.clubId),
    ]);
    game = <PenaltyGame key={m.id} initial={active} cards={cards} opponent={opponent} rewards={status.rewards} />;
  }
  const roster = game ? [] : await getPenaltyRoster(profile.id);

  return (
    <>
      <PageHeader
        title="Tirs au but"
        subtitle={`Quart, demie, finale contre l'ordinateur, avec tes propres cartes. ${status.remaining}/${status.dailyLimit} tournoi${plural} restant${plural} aujourd'hui.`}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={game ? undefined : "Ton équipe de tireurs"}>
          {game ?? <PenaltySetup cards={roster} remaining={status.remaining} />}
        </Panel>
        <div className="space-y-5">
          <Panel title="Comment jouer">
            <ul className="list-disc space-y-1 pl-4 text-sm text-chalk-muted">
              <li>5 tirs chacun, tu tires en premier, puis mort subite.</li>
              <li>En attaque, clique sur un côté du but ; en défense, choisis où plonge ton gardien.</li>
              <li>La note de tes cartes compte (précision du tireur, réflexes du gardien).</li>
              <li>L&apos;ordinateur lit tes habitudes : varie tes choix !</li>
            </ul>
          </Panel>
          <Panel title="Récompenses">
            <Rewards rewards={status.rewards} />
            <p className="mt-2 text-xs text-chalk-faint">
              Ton bilan : {status.wins} victoire{status.wins > 1 ? "s" : ""} en {status.played} tournoi
              {status.played > 1 ? "s" : ""}.
            </p>
          </Panel>
          <Panel title="Classement (tournois gagnés)">
            <Leaderboard rows={leaderboard} />
          </Panel>
        </div>
      </div>
    </>
  );
}
