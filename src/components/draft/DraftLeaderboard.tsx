import Link from "next/link";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import type { DraftLeaderboardRow } from "@/lib/data/draft";
import { LINK_COLORS } from "@/lib/draft";
import { formatRelative } from "@/lib/format";

/** Classement all-time : meilleur score de chaque joueur, lien vers l'équipe. */
export function DraftLeaderboard({ rows }: { rows: DraftLeaderboardRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-chalk-muted">Personne n&apos;a encore terminé de draft. À toi l&apos;honneur !</p>;
  }
  return (
    <ol className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.userId}>
          <Link
            href={`/draft/${r.draftId}`}
            className={clsx("flex items-center gap-3 px-1 py-2 hover:bg-night-800/60", r.isMe && "bg-turf/10")}
          >
            <span className="w-7 text-right font-display text-sm font-bold text-chalk-muted tabular-nums">{r.rank}</span>
            <Avatar name={r.username} url={r.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{r.username}</span>
              <span className="block text-xs text-chalk-faint">
                Note {r.rating.toFixed(2)} · collectif {r.chemistry} · {formatRelative(r.completedAt)}
              </span>
            </span>
            <span className="font-display text-lg font-extrabold text-turf tabular-nums">{r.score.toFixed(2)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Note, collectif et score d'une équipe (en cours ou terminée). */
export function DraftScoreline({
  rating,
  chemistry,
  score,
  provisional = false,
}: {
  rating: number | null;
  chemistry: number;
  score: number | null;
  provisional?: boolean;
}) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-lg bg-night-900 px-2 py-2">
        <dt className="text-[11px] text-chalk-faint uppercase">Note</dt>
        <dd className="font-display text-xl font-extrabold tabular-nums">{rating === null ? "–" : rating.toFixed(2)}</dd>
      </div>
      <div className="rounded-lg bg-night-900 px-2 py-2">
        <dt className="text-[11px] text-chalk-faint uppercase">Collectif</dt>
        <dd className="font-display text-xl font-extrabold tabular-nums">
          {chemistry}
          <span className="text-sm text-chalk-faint">/100</span>
        </dd>
      </div>
      <div className="rounded-lg bg-turf/15 px-2 py-2">
        <dt className="text-[11px] text-chalk-faint uppercase">{provisional ? "Score provisoire" : "Score"}</dt>
        <dd className="font-display text-xl font-extrabold text-turf tabular-nums">{score === null ? "–" : score.toFixed(2)}</dd>
      </div>
    </dl>
  );
}

const LEGEND: { strength: 0 | 1 | 2; label: string; rule: string }[] = [
  {
    strength: 2,
    label: "Vert",
    rule: "même club, ou même ligue et même nation",
  },
  { strength: 1, label: "Orange", rule: "même ligue ou même nation" },
  { strength: 0, label: "Rouge", rule: "rien en commun" },
];

export function LinkLegend() {
  return (
    <ul className="space-y-1.5 text-sm text-chalk-muted">
      {LEGEND.map((l) => (
        <li key={l.strength} className="flex items-center gap-2">
          <span className="h-1 w-6 shrink-0 rounded" style={{ backgroundColor: LINK_COLORS[l.strength] }} aria-hidden="true" />
          <span>
            <strong className="text-chalk">{l.label}</strong> : {l.rule}
          </span>
        </li>
      ))}
      <li className="pt-1 text-xs text-chalk-faint">
        Chaque joueur vaut jusqu&apos;à 10 points de collectif selon ses liens (total sur 100). Score = note moyenne des 11 +
        collectif / 20.
      </li>
    </ul>
  );
}
