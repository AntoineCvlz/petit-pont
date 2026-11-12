import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Panel";
import { getLeaderboard, getLeaderboardRefreshedAt } from "@/lib/data/community";
import { requireProfile } from "@/lib/data/profile";
import { formatRelative } from "@/lib/format";
import { formatMetric, METRICS, parseMetric, parsePeriod, PERIODS, type Metric, type Period } from "@/lib/leaderboard";

export const metadata: Metadata = { title: "Classement" };

const MEDALS = ["text-r-legendaire", "text-r-commune", "text-[#d08b54]"];

export default async function ClassementPage({ searchParams }: PageProps<"/classement">) {
  await requireProfile();
  const params = await searchParams;
  const metric = parseMetric(params.metrique);
  const period = parsePeriod(params.periode);
  const [rows, refreshedAt] = await Promise.all([getLeaderboard(metric, period, 50), getLeaderboardRefreshedAt()]);
  const me = rows.find((r) => r.isMe);
  const top = rows.filter((r) => r.rank <= 50);
  const meOutside = me && !top.some((r) => r.isMe && r.rank <= 50) ? me : null;

  const href = (m: Metric, p: Period) => {
    const q = new URLSearchParams();
    if (m !== "progression") q.set("metrique", m);
    if (p !== "all") q.set("periode", p);
    const s = q.toString();
    return s ? `/classement?${s}` : "/classement";
  };

  return (
    <>
      <PageHeader title="Classement" subtitle={refreshedAt ? `Mis à jour ${formatRelative(refreshedAt)} (toutes les 10 minutes)` : undefined}>
        <Link href="/joueurs" className={buttonClasses("secondary", "sm")}>
          Rechercher un joueur
        </Link>
      </PageHeader>

      <nav aria-label="Métrique" className="mb-2 flex gap-1 overflow-x-auto border-b border-line">
        {(Object.keys(METRICS) as Metric[]).map((m) => (
          <Link
            key={m}
            href={href(m, period)}
            aria-current={metric === m ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              metric === m ? "border-turf font-semibold text-chalk" : "border-transparent text-chalk-muted hover:text-chalk",
            )}
          >
            {METRICS[m].label}
          </Link>
        ))}
      </nav>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-chalk-faint">{METRICS[metric].hint}</p>
        <div className="flex gap-1" role="group" aria-label="Période">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <Link
              key={p}
              href={href(metric, p)}
              aria-current={period === p ? "true" : undefined}
              className={clsx(
                "rounded-lg px-2.5 py-1 text-xs",
                period === p ? "bg-night-600 font-semibold text-chalk" : "text-chalk-muted hover:bg-night-800 hover:text-chalk",
              )}
            >
              {PERIODS[p]}
            </Link>
          ))}
        </div>
      </div>

      {me && (
        <div className="sticky top-16 z-10 mb-3 flex items-center gap-3 rounded-xl border border-turf/40 bg-night-850/95 px-4 py-2.5 backdrop-blur">
          <span className="font-display text-xl font-extrabold text-turf tabular-nums">#{me.rank}</span>
          <span className="flex-1 text-sm">Ta position</span>
          <span className="font-semibold tabular-nums">{formatMetric(metric, me.value)}</span>
        </div>
      )}

      {top.length === 0 ? (
        <EmptyState title="Classement vide">Personne n&apos;est encore classé sur cette période.</EmptyState>
      ) : (
        <Panel>
          <ol className="divide-y divide-line">
            {[...top, ...(meOutside ? [meOutside] : [])].map((r, i, all) => (
              <li
                key={`${r.userId}-${i}`}
                className={clsx(
                  "flex items-center gap-3 py-2",
                  r.isMe && "-mx-2 rounded-lg bg-turf/10 px-2",
                  meOutside && i === all.length - 1 && "mt-2 border-t-2 border-dashed border-line-strong",
                )}
              >
                <span className={clsx("w-10 text-right font-display text-lg font-extrabold tabular-nums", MEDALS[r.rank - 1] ?? "text-chalk-faint")}>
                  {r.rank}
                </span>
                <Avatar name={r.username} />
                <Link href={`/joueurs/${encodeURIComponent(r.username)}`} className="min-w-0 flex-1 truncate font-semibold hover:text-turf hover:underline">
                  {r.username}
                  {r.isMe && <span className="ml-2 text-xs font-normal text-turf">toi</span>}
                </Link>
                <span className="font-semibold tabular-nums">{formatMetric(metric, r.value)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </>
  );
}
