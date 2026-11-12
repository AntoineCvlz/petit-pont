import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { BoosterPack } from "@/components/boosters/BoosterPack";
import { LiveStock } from "@/components/boosters/LiveStock";
import { OddsTable } from "@/components/boosters/OddsTable";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { availabilityLabel } from "@/lib/boosters";
import { listBoosters, listMyGifts } from "@/lib/data/boosters";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Boosters" };

export default async function BoostersPage() {
  const [boosters, gifts] = await Promise.all([listBoosters(), listMyGifts()]);

  return (
    <>
      <PageHeader title="Boosters" subtitle="Tirage côté serveur, probabilités affichées pour chaque paquet." />
      {gifts.length > 0 && (
        <section aria-labelledby="gifts-title" className="mb-5 rounded-xl border border-turf/40 bg-turf/5 p-4">
          <h2 id="gifts-title" className="mb-3 font-display text-sm font-bold tracking-widest text-turf uppercase">
            Packs offerts par l&apos;équipe
          </h2>
          <ul className="flex flex-wrap gap-3">
            {gifts.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/boosters/${g.slug}?cadeau`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-night-850 p-3 pr-4 transition-colors duration-150 hover:border-line-strong hover:bg-night-800"
                >
                  <BoosterPack name={g.name} kind={g.kind} cardsCount={g.cardsCount} imageUrl={g.imageUrl} size="sm" />
                  <div>
                    <p className="font-display font-extrabold tracking-wide uppercase">{g.name}</p>
                    <p className="text-sm text-chalk-muted">
                      ×{g.count} · <span className="font-semibold text-turf">Ouvrir</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {boosters.length === 0 ? (
        <EmptyState title="Vestiaire vide">Aucun booster en vente pour le moment.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boosters.map((b) => {
            const label = availabilityLabel(b.availability);
            return (
              <li key={b.id}>
                <Link
                  href={`/boosters/${b.slug}`}
                  className={clsx(
                    "flex h-full gap-4 rounded-xl border border-line bg-night-850 p-4 transition-colors duration-150 hover:border-line-strong hover:bg-night-800",
                  )}
                >
                  <BoosterPack name={b.name} kind={b.kind} cardsCount={b.cardsCount} imageUrl={b.imageUrl} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div>
                      <p className="font-display text-lg leading-tight font-extrabold tracking-wide uppercase">{b.name}</p>
                      <p className="mt-0.5 text-xs text-chalk-muted">{b.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {b.price === 0 ? <span className="font-semibold text-turf">Gratuit</span> : <CoinAmount amount={b.price} />}
                      <span className="text-chalk-faint">·</span>
                      <span className="text-chalk-muted">{b.cardsCount} cartes</span>
                      {b.guaranteeRarity && b.guaranteeCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-chalk-muted">
                          ≥ {b.guaranteeCount} <RarityBadge rarity={b.guaranteeRarity} />
                        </span>
                      )}
                    </div>
                    {b.kind === "event" && b.endsAt && (
                      <p className="text-xs text-r-epique">Jusqu&apos;au {formatDate(b.endsAt)}</p>
                    )}
                    {b.kind === "limited" && b.stockTotal !== null && b.stockRemaining !== null && (
                      <LiveStock boosterId={b.id} initial={b.stockRemaining} total={b.stockTotal} />
                    )}
                    <div className="mt-auto">
                      <OddsTable odds={b.odds} compact />
                    </div>
                    {label && <p className="text-xs font-semibold text-chalk-faint uppercase">{label}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
