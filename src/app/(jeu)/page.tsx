import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { BoosterPack } from "@/components/boosters/BoosterPack";
import { FreeBoosterTimer } from "@/components/boosters/FreeBoosterTimer";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Panel";
import { getActivityFeed } from "@/lib/data/activity";
import { getFreeBoosterNextAt } from "@/lib/data/boosters";
import { getCollectionTotal, getRecentCards } from "@/lib/data/cards";
import { getCollectionStats, requireProfile } from "@/lib/data/profile";

export default async function AccueilPage() {
  const profile = await requireProfile();
  const [recent, total, stats, feed, freeBooster] = await Promise.all([
    getRecentCards(profile.id, 6),
    getCollectionTotal(),
    getCollectionStats(profile.id),
    getActivityFeed(12),
    getFreeBoosterNextAt(),
  ]);
  const progress = total ? Math.round((stats.distinctCards / total) * 100) : 0;

  return (
    <>
      <PageHeader title={`Salut ${profile.username}`} subtitle="Le point sur ta collection et sur la communauté." />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {freeBooster && (
            <Panel className="pp-net">
              <div className="flex items-center gap-4">
                <BoosterPack name={freeBooster.name} kind="free" cardsCount={freeBooster.cardsCount} size="sm" />
                <div className="space-y-2">
                  <p className="font-display text-xl font-extrabold tracking-wide uppercase italic">
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
              <div className="h-2 overflow-hidden rounded-full bg-night-700" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-turf" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Panel>

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
              <div className="flex gap-3 overflow-x-auto pb-1">
                {recent.map((c) => (
                  <Card key={c.instanceId} template={c.template} collectionTotal={total} serialNumber={c.serialNumber} size="sm" />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Fil d'activité">
          <ActivityFeed items={feed} />
        </Panel>
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
