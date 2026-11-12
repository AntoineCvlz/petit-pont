import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveListingGrid } from "@/components/market/LiveListingGrid";
import { SalesTable } from "@/components/market/SalesTable";
import { WishlistButton } from "@/components/market/WishlistButton";
import { Card } from "@/components/ui/Card";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { getCollectionTotal, getTemplateById } from "@/lib/data/cards";
import {
  getPriceStats,
  isOnWishlist,
  listActiveListingsForTemplate,
  listSalesForTemplate,
  recordMarketSearch,
} from "@/lib/data/market";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Historique de prix" };


export default async function MarketCardPage({ params }: PageProps<"/marche/carte/[templateId]">) {
  const { templateId } = await params;
  const id = Number(templateId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const profile = await requireProfile();
  const template = await getTemplateById(id);
  if (!template) notFound();

  const [listings, sales, stats, wished, total] = await Promise.all([
    listActiveListingsForTemplate(id),
    listSalesForTemplate(id),
    getPriceStats(id),
    isOnWishlist(profile.id, id),
    getCollectionTotal(),
    recordMarketSearch({ templateId: id }),
  ]);

  return (
    <>
      <Link href="/marche" className="text-sm text-chalk-muted hover:text-chalk">
        ← Marché
      </Link>
      <div className="mt-4 grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center md:block">
          <Card template={template} collectionTotal={total} size="lg" />
        </div>
        <div className="min-w-0 space-y-5">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{template.playerName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-chalk-muted">
              <RarityBadge rarity={template.rarity} />
              <span>{template.edition === "Base" ? template.season : `${template.edition} · ${template.season}`}</span>
              <span>·</span>
              <Link href={`/wiki/${template.playerSlug}`} className="text-turf hover:underline">
                Fiche du joueur
              </Link>
            </div>
            <div className="mt-3">
              <WishlistButton templateId={id} initial={wished} />
            </div>
          </div>

          <Panel title="Prix constatés">
            {stats ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Dernière vente", stats.lastPrice],
                  ["Prix moyen", stats.avgPrice],
                  ["Plus bas", stats.minPrice],
                  ["Plus haut", stats.maxPrice],
                ].map(([label, v]) => (
                  <div key={label as string} className="rounded-lg bg-night-800 p-3">
                    <dt className="text-xs text-chalk-muted">{label}</dt>
                    <dd>
                      <CoinAmount amount={v as number} className="font-display text-lg" />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-chalk-muted">Cette carte ne s&apos;est encore jamais vendue sur le marché.</p>
            )}
            {stats && <p className="mt-2 text-xs text-chalk-faint">{stats.sales} vente{stats.sales > 1 ? "s" : ""} au total</p>}
          </Panel>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-sm font-bold tracking-wider text-chalk-muted uppercase">
          En vente ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <EmptyState title="Aucune annonce">Personne ne vend cette carte pour l&apos;instant. Ajoute-la à ta liste de souhaits !</EmptyState>
        ) : (
          <LiveListingGrid listings={listings} viewerId={profile.id} balance={profile.coins} collectionTotal={total} showNewBanner={false} />
        )}
      </section>

      {sales.length > 0 && (
        <Panel title="Historique des ventes" className="mt-6">
          <SalesTable sales={sales} showCard={false} />
        </Panel>
      )}
    </>
  );
}
