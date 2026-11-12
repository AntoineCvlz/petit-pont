import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { getCollectionTotal } from "@/lib/data/cards";
import {
  getCompletedAlbums,
  getPlayerByUsername,
  getPlayerStats,
  getShowcase,
  getTradeableDuplicates,
  getWishlist,
} from "@/lib/data/community";
import { requireProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";
import { formatMetric } from "@/lib/leaderboard";

export async function generateMetadata({ params }: PageProps<"/joueurs/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: decodeURIComponent(username) };
}

export default async function PublicProfilePage({ params }: PageProps<"/joueurs/[username]">) {
  const { username } = await params;
  const viewer = await requireProfile();
  const player = await getPlayerByUsername(decodeURIComponent(username));
  if (!player) notFound();
  const isMe = player.id === viewer.id;

  const [stats, showcase, wishlist, duplicates, albums, total] = await Promise.all([
    getPlayerStats(player.id),
    getShowcase(player.id),
    getWishlist(player.id),
    getTradeableDuplicates(player.id),
    getCompletedAlbums(player.id),
    getCollectionTotal(),
  ]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar name={player.username} url={player.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold tracking-wide italic">{player.username}</h1>
          <p className="text-sm text-chalk-muted">
            Inscrit·e le {formatDate(player.createdAt)}
            {player.isDemo && " · joueur de démonstration"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/joueurs/${encodeURIComponent(player.username)}/collection`} className={buttonClasses("secondary", "md")}>
            Voir la collection
          </Link>
          {isMe ? (
            <Link href="/profil" className={buttonClasses("ghost", "md")}>
              Modifier mon profil
            </Link>
          ) : (
            <Link href={`/echanges/nouveau?avec=${encodeURIComponent(player.username)}`} className={buttonClasses("primary", "md")}>
              Proposer un échange
            </Link>
          )}
        </div>
      </div>

      {stats && (
        <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              ["Progression", formatMetric("progression", stats.progression)],
              ["Cartes", `${stats.cards}`],
              ["Albums complétés", `${stats.albums}`],
              ["Score de rareté", formatMetric("rarity_score", stats.rarityScore)],
              ["Boosters ouverts", `${stats.boosters}`],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-night-850 p-3">
              <dt className="text-xs text-chalk-muted">{label}</dt>
              <dd className="font-display text-2xl font-extrabold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Panel title="Vitrine" className="mb-5">
        {showcase.length === 0 ? (
          <p className="text-sm text-chalk-muted">{isMe ? "Choisis tes 5 cartes vitrines depuis ton profil." : "Aucune carte en vitrine."}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {showcase.map((s) => (
              <Card key={s.instanceId} template={s.template} collectionTotal={total} serialNumber={s.serialNumber} />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={`Doublons disponibles à l'échange (${duplicates.length})`}>
          {duplicates.length === 0 ? (
            <p className="text-sm text-chalk-muted">Aucun doublon disponible.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {duplicates.slice(0, 40).map((d) => (
                <li key={d.template.id} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-night-800 px-2 py-1 text-xs">
                  <span className="font-display font-bold tabular-nums">{d.template.rating}</span>
                  {d.template.playerName}
                  <RarityBadge rarity={d.template.rarity} />
                  {d.spare > 1 && <span className="text-chalk-faint">×{d.spare}</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Liste de souhaits (${wishlist.length})`}>
          {wishlist.length === 0 ? (
            <p className="text-sm text-chalk-muted">Liste de souhaits vide.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {wishlist.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/marche/carte/${t.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-night-800 px-2 py-1 text-xs hover:border-line-strong"
                  >
                    {t.playerName} <RarityBadge rarity={t.rarity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Albums complétés (${albums.length})`} className="lg:col-span-2">
          {albums.length === 0 ? (
            <EmptyState title="Pas encore d'album bouclé" />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {albums.map((a) => (
                <li key={a.slug} className="rounded-lg border border-r-legendaire/40 bg-r-legendaire/10 px-3 py-1.5 text-sm">
                  <span className="font-semibold text-r-legendaire">{a.name}</span>
                  <span className="ml-2 text-xs text-chalk-muted">{formatDate(a.completedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
