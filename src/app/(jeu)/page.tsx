import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { WishlistMatches } from "@/components/community/WishlistMatches";
import { AlbumProgress, albumPercent } from "@/components/albums/AlbumProgress";
import { BoosterPack } from "@/components/boosters/BoosterPack";
import { FreeBoosterCountdown } from "@/components/boosters/FreeBoosterTimer";
import { DailyBonusButton } from "@/components/economy/DailyBonusButton";
import { NavIcon } from "@/components/layout/NavIcon";
import { SalesTable } from "@/components/market/SalesTable";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { getActivityFeed } from "@/lib/data/activity";
import { listAlbums } from "@/lib/data/albums";
import { getWishlistMatches } from "@/lib/data/community";
import { getDailyBonusStatus } from "@/lib/data/economy";
import { getMissionsStatus } from "@/lib/data/farm";
import { listRecentSales } from "@/lib/data/market";
import { countPendingReceived } from "@/lib/data/trades";
import { getFreeBoosterNextAt } from "@/lib/data/boosters";
import { getCollectionTotal, getRecentCards } from "@/lib/data/cards";
import { getCollectionStats, requireProfile } from "@/lib/data/profile";

/** Raccourcis vers les modes de jeu (pages existantes). */
const PLAY_SHORTCUTS = [
  { href: "/draft", title: "Draft", pitch: "Un onze tiré au sort, joue le collectif", icon: "draft" },
  { href: "/penalty", title: "Tirs au but", pitch: "Quart, demie, finale : des pièces à gagner", icon: "penalty" },
  { href: "/saison", title: "Saison", pitch: "10 journées avec ton onze", icon: "play" },
  { href: "/defis", title: "Défis", pitch: "Tes doublons contre des packs", icon: "trade" },
] as const;

type Todo = { href: string; label: string; icon: "trade" | "album" };

export default async function AccueilPage() {
  const profile = await requireProfile();
  const [recent, total, stats, feed, freeBooster, albums, dailyBonus, sales, pendingTrades, matches, missions] =
    await Promise.all([
      getRecentCards(profile.id, 8),
      getCollectionTotal(),
      getCollectionStats(profile.id),
      getActivityFeed(12),
      getFreeBoosterNextAt(),
      listAlbums(profile.id),
      getDailyBonusStatus(),
      listRecentSales(5),
      countPendingReceived(profile.id),
      getWishlistMatches(4),
      getMissionsStatus(),
    ]);
  const inProgress = albums
    .filter((a) => !a.completedAt)
    .sort((a, b) => albumPercent(b.owned, b.total) - albumPercent(a.owned, a.total))
    .slice(0, 3);
  const albumsToClaim = albums.filter((a) => !a.completedAt && a.owned === a.total).length;
  const missionsToClaim = missions.missions.filter((m) => m.progress >= m.target && !m.claimed).length;

  // « À faire » : uniquement des actions réellement disponibles
  const todo: Todo[] = [];
  if (pendingTrades > 0) {
    todo.push({ href: "/echanges", label: `${pendingTrades} échange${pendingTrades > 1 ? "s" : ""} en attente`, icon: "trade" });
  }
  if (missionsToClaim > 0) {
    todo.push({
      href: "/missions",
      label: `${missionsToClaim} mission${missionsToClaim > 1 ? "s" : ""} à récupérer`,
      icon: "album",
    });
  }
  if (albumsToClaim > 0) {
    todo.push({
      href: "/albums",
      label: `${albumsToClaim} album${albumsToClaim > 1 ? "s" : ""} complété${albumsToClaim > 1 ? "s" : ""} : récompense`,
      icon: "album",
    });
  }

  return (
    <div className="space-y-5">
      {/* En-tête : salut, chiffres clés, bonus du jour et booster gratuit */}
      <section className="pp-pitch relative overflow-hidden rounded-2xl border border-line bg-night-850 p-4 sm:p-6">
        <div className="pp-net pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm text-chalk-muted">Au vestiaire aujourd&apos;hui</p>
            <h1 className="font-display text-3xl font-extrabold tracking-wide break-words uppercase italic sm:text-4xl">
              Salut <span className="text-turf">{profile.username}</span>
            </h1>
            <dl className="mt-4 grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Stat label="Pièces" value={<CoinAmount amount={profile.coins} />} />
              <Stat label="Cartes différentes" value={stats.distinctCards.toLocaleString("fr-FR")} />
              <Stat label="Exemplaires" value={stats.totalCopies.toLocaleString("fr-FR")} />
              <Stat label="Doublons" value={(stats.totalCopies - stats.distinctCards).toLocaleString("fr-FR")} />
            </dl>
            {dailyBonus.available && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <DailyBonusButton amount={dailyBonus.amount} />
                <span className="text-sm text-chalk-muted">Ta prime de présence t&apos;attend.</span>
              </div>
            )}
          </div>

          {freeBooster && (
            <div className="flex items-center gap-4 rounded-xl border border-turf/30 bg-night-900/70 p-3 sm:p-4">
              <BoosterPack
                name={freeBooster.name}
                kind="free"
                slug={freeBooster.slug}
                cardsCount={freeBooster.cardsCount}
                size="sm"
              />
              <div className="min-w-0 space-y-2">
                <p className="font-display text-lg leading-tight font-extrabold tracking-wide uppercase italic">
                  {freeBooster.stock > 0
                    ? `${freeBooster.stock} booster${freeBooster.stock > 1 ? "s" : ""} gratuit${freeBooster.stock > 1 ? "s" : ""}`
                    : "Booster gratuit en recharge"}
                </p>
                <div className="flex gap-1" role="img" aria-label={`${freeBooster.stock} sur ${freeBooster.cap} en réserve`}>
                  {Array.from({ length: freeBooster.cap }, (_, i) => (
                    <span
                      key={i}
                      className={i < freeBooster.stock ? "h-2 w-3 rounded-sm bg-turf" : "h-2 w-3 rounded-sm bg-night-700"}
                    />
                  ))}
                </div>
                {freeBooster.nextAt && (
                  <p className="text-xs text-chalk-muted">
                    Prochain dans <FreeBoosterCountdown nextAt={freeBooster.nextAt} />
                  </p>
                )}
                {freeBooster.stock > 0 && (
                  <Link href={`/boosters/${freeBooster.slug}`} className={buttonClasses("primary", "md")}>
                    Ouvrir
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {todo.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="À faire">
          {todo.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="flex items-center gap-2 rounded-full border border-turf/40 bg-turf/10 px-3 py-1.5 text-sm font-semibold text-turf transition-colors duration-150 hover:bg-turf/20"
              >
                <NavIcon name={t.icon} className="h-4 w-4" />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Modes de jeu */}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Jouer">
        {PLAY_SHORTCUTS.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="group flex h-full flex-col gap-1 rounded-xl border border-line bg-night-850 p-3 transition-colors duration-150 hover:border-turf/50 hover:bg-night-800 sm:p-4"
            >
              <span className="flex items-center gap-2">
                <NavIcon name={m.icon} className="h-5 w-5 text-turf" />
                <span className="font-display text-base font-extrabold tracking-wide uppercase group-hover:text-turf sm:text-lg">
                  {m.title}
                </span>
              </span>
              <span className="text-xs text-chalk-muted sm:text-sm">{m.pitch}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <div className="space-y-5">
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
              <div
                className="flex gap-3 overflow-x-auto pb-1"
                tabIndex={0}
                role="region"
                aria-label="Dernières cartes obtenues (défilement horizontal)"
              >
                {recent.map((c) => (
                  <Card
                    key={c.instanceId}
                    template={c.template}
                    collectionTotal={total}
                    serialNumber={c.serialNumber}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
            <Panel
              title="Albums en cours"
              action={
                <Link href="/albums" className="text-xs font-semibold text-turf hover:underline">
                  Tous les albums
                </Link>
              }
            >
              {inProgress.length === 0 ? (
                <p className="text-sm text-chalk-muted">Commence un album en ouvrant des boosters.</p>
              ) : (
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
              )}
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
        </div>

        <Panel title="Fil d'activité">
          <ActivityFeed items={feed} />
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-xs text-chalk-muted">{label}</dt>
      <dd className="font-display text-2xl leading-none font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}
