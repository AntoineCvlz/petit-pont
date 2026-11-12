import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Flag } from "@/components/ui/Flag";
import { Panel } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { getCollectionTotal } from "@/lib/data/cards";
import { getPlayer } from "@/lib/data/wiki";
import { formatCoins } from "@/lib/format";
import { POSITION_LABELS } from "@/lib/rarity";

export async function generateMetadata({ params }: PageProps<"/wiki/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayer(slug);
  return { title: player?.displayName ?? "Joueur introuvable" };
}

export default async function PlayerPage({ params }: PageProps<"/wiki/[slug]">) {
  const { slug } = await params;
  const [player, total] = await Promise.all([getPlayer(slug), getCollectionTotal()]);
  if (!player) notFound();

  const currentClub = player.clubs.find((c) => c.endYear === null && c.startYear !== null) ?? null;
  const bio =
    player.bio ??
    `${POSITION_LABELS[player.position]} international (${player.nation.name})${currentClub ? `, actuellement à ${currentClub.name}` : ""}.`;

  return (
    <>
      <Link href="/wiki" className="text-sm text-chalk-muted hover:text-chalk">
        ← Wiki des joueurs
      </Link>

      <div className="mt-3 mb-5 flex flex-wrap items-center gap-3">
        <Flag nation={player.nation} className="h-6 w-9" />
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{player.displayName}</h1>
        {player.isLegend && (
          <span className="rounded-md border border-r-legendaire/40 px-2 py-0.5 font-display text-xs font-bold tracking-wider text-r-legendaire uppercase">
            Légende
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel title="Fiche">
          <p className="text-sm leading-relaxed text-chalk-muted">{bio}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-chalk-faint">Nation</dt>
            <dd>{player.nation.name}</dd>
            <dt className="text-chalk-faint">Poste</dt>
            <dd>{POSITION_LABELS[player.position]}</dd>
            {player.birthYear && (
              <>
                <dt className="text-chalk-faint">Naissance</dt>
                <dd>{player.birthYear}</dd>
              </>
            )}
            <dt className="text-chalk-faint">Clubs</dt>
            <dd>
              <ul>
                {player.clubs.map((c) => (
                  <li key={c.name}>
                    {c.name}
                    {c.startYear && (
                      <span className="text-chalk-faint">
                        {" "}
                        ({c.startYear}–{c.endYear ?? "…"})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        </Panel>

        <Panel title={`Versions de cartes (${player.versions.length})`}>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] justify-items-center gap-4">
            {player.versions.map((v) => (
              <li key={v.id} className="flex flex-col items-center gap-2">
                <Card template={v} collectionTotal={total} />
                <div className="w-[168px] space-y-0.5 text-xs text-chalk-muted">
                  <div className="flex items-center justify-between">
                    <RarityBadge rarity={v.rarity} />
                    <span>{v.edition === "Base" ? v.season : v.edition}</span>
                  </div>
                  <p>
                    En circulation : <span className="font-semibold text-chalk tabular-nums">{v.circulation}</span>
                    {v.maxSupply && <span className="text-chalk-faint"> / {v.maxSupply}</span>}
                  </p>
                  <p>
                    Prix moyen :{" "}
                    {v.averagePrice !== null ? (
                      <span className="font-semibold text-coin tabular-nums">{formatCoins(v.averagePrice)}</span>
                    ) : (
                      <span className="text-chalk-faint">aucune vente</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
