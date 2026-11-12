import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { WishlistMatches } from "@/components/community/WishlistMatches";
import { AlbumProgress, albumPercent } from "@/components/albums/AlbumProgress";
import { BoosterPack } from "@/components/boosters/BoosterPack";
import { FreeBoosterTimer } from "@/components/boosters/FreeBoosterTimer";
import { DailyBonusButton } from "@/components/economy/DailyBonusButton";
import { SalesTable } from "@/components/market/SalesTable";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Panel";
import { getActivityFeed } from "@/lib/data/activity";
import { listAlbums } from "@/lib/data/albums";
import { getWishlistMatches } from "@/lib/data/community";
import { getDailyBonusStatus } from "@/lib/data/economy";
import { listRecentSales } from "@/lib/data/market";
import { countPendingReceived } from "@/lib/data/trades";
import { getFreeBoosterNextAt } from "@/lib/data/boosters";
import { getCollectionTotal, getRecentCards } from "@/lib/data/cards";
import { getCollectionStats, requireProfile } from "@/lib/data/profile";

export default async function AccueilPage() {
  const profile = await requireProfile();
  const [recent, total, stats, feed, freeBooster, albums, dailyBonus, sales, pendingTrades, matches] = await Promise.all([
    getRecentCards(profile.id, 6),
    getCollectionTotal(),
    getCollectionStats(profile.id),
    getActivityFeed(12),
    getFreeBoosterNextAt(),
    listAlbums(profile.id),
    getDailyBonusStatus(),
    listRecentSales(5),
    countPendingReceived(profile.id),
    getWishlistMatches(4),
  ]);
  const inProgress = albums
    .filter((a) => !a.completedAt)
    .sort((a, b) => albumPercent(b.owned, b.total) - albumPercent(a.owned, a.total))
    .slice(0, 3);
  const progress = total ? Math.round((stats.distinctCards / total) * 100) : 0;

  return (
    <>
      <PageHeader title={`Salut ${profile.username}`} subtitle="Le point sur ta collection et sur la communauté." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <div className="space-y-5">
          {dailyBonus.available && (
            <Panel className="border-coin/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-extrabold tracking-wide uppercase italic">Bonus du jour</p>
                  <p className="text-sm text-chalk-muted">Ta prime de présence au vestiaire t&apos;attend.</p>
                </div>
                <DailyBonusButton amount={dailyBonus.amount} />
              </div>
            </Panel>
          )}
          {pendingTrades > 0 && (
            <Link
              href="/echanges"
              className="flex items-center justify-between gap-3 rounded-xl border border-turf/40 bg-turf/10 px-4 py-3 transition-colors duration-150 hover:bg-turf/15"
            >
              <span className="font-display text-lg font-extrabold tracking-wide uppercase italic">
                {pendingTrades} échange{pendingTrades > 1 ? "s" : ""} en attente
              </span>
              <span className="text-sm font-semibold text-turf">Voir les propositions →</span>
            </Link>
          )}
          {freeBooster && (
            <Panel className="pp-net">
              <div className="flex min-w-0 items-center gap-4">
                <BoosterPack name={freeBooster.name} kind="free" cardsCount={freeBooster.cardsCount} size="sm" />
                <div className="min-w-0 space-y-2">
                  <p className="font-display text-xl font-extrabold tracking-wide break-words uppercase italic">
                    {freeBooster.nextAt ? "Booster gratuit en recharge" : "Ton booster gratuit est prêt !"}
                  </p>
                  {freeBooster.nextAt ? (
                    <div className="flex items-center gap-2 text-sm text-chalk-muted">
                      Disponible dans <FreeBoosterTimer slug={freeBooster.slug} nextAt={freeBooster.nextAt} />
                    </div>
                  ) : (
                    <Link href={`/boosters/${freeBooster.slug}`} className={buttonClasses("primary", "md")}>
                      Ouvrir mon booster gratuit
                    </Link>
                  )}
                </div>
              </div>
            </Panel>
          )}
          <Panel title="Ta progression">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <Stat label="Cartes différentes" value={`${stats.distinctCards} / ${total}`} />
              <Stat label="Exemplaires" value={String(stats.totalCopies)} />
              <Stat label="Doublons" value={String(stats.totalCopies - stats.distinctCards)} />
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-chalk-muted">
                <span>Progression globale</span>
                <span className="tabular-nums">{progress} %</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-night-700" role="progressbar" aria-label="Progression globale" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-turf" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Panel>

          {inProgress.length > 0 && (
            <Panel
              title="Albums en cours"
              action={
                <Link href="/albums" className="text-xs font-semibold text-turf hover:underline">
                  Tous les albums
                </Link>
              }
            >
              <ul className="space-y-3">
                {inProgress.map((a) => (
                  <li key={a.id}>
                    <Link href={`/albums/${a.slug}`} className="group block">
                      <p className="mb-1 text-sm font-semibold group-hover:text-turf">
                        {a.name}
                        {a.owned === a.total && <span className="ml-2 text-xs text-turf">Récompense à réclamer</span>}
                      </p>
                      <AlbumProgress owned={a.owned} total={a.total} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {matches.length > 0 && (
            <Panel
              title="Ils ont des cartes de ta liste de souhaits"
              action={
                <Link href="/joueurs" className="text-xs font-semibold text-turf hover:underline">
                  Tous les joueurs
                </Link>
              }
            >
              <WishlistMatches matches={matches} />
            </Panel>
          )}

          <Panel
            title="Dernières cartes obtenues"
            action={
              recent.length > 0 && (
                <Link href="/collection" className="text-xs font-semibold text-turf hover:underline">
                  Toute la collection
                </Link>
              )
            }
          >
            {recent.length === 0 ? (
              <EmptyState title="Aucune carte pour l'instant">
                Ouvre ton premier booster pour lancer ta collection.{" "}
                <Link href="/boosters" className="font-semibold text-turf hover:underline">
                  Voir les boosters
                </Link>
              </EmptyState>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1" tabIndex={0} role="region" aria-label="Dernières cartes obtenues (défilement horizontal)">
                {recent.map((c) => (
                  <Card key={c.instanceId} template={c.template} collectionTotal={total} serialNumber={c.serialNumber} size="sm" />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Fil d'activité">
            <ActivityFeed items={feed} />
          </Panel>
          <Panel
            title="Activité du marché"
            action={
              <Link href="/marche?onglet=ventes" className="text-xs font-semibold text-turf hover:underline">
                Toutes les ventes
              </Link>
            }
          >
            {sales.length === 0 ? (
              <p className="text-sm text-chalk-muted">Aucune vente pour l&apos;instant.</p>
            ) : (
              <SalesTable sales={sales} compact />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-chalk-muted">{label}</p>
    </div>
  );
}
