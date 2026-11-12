import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { clsx } from "clsx";
import { LiveListingGrid } from "@/components/market/LiveListingGrid";
import { SalesTable } from "@/components/market/SalesTable";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { FilterBar, FilterBarSkeleton } from "@/components/ui/FilterBar";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Panel";
import { getCollectionTotal } from "@/lib/data/cards";
import {
  getMarketFeePercent,
  getMarketFilterOptions,
  listActiveListings,
  listMostWanted,
  listMyListings,
  listRecentSales,
  recordMarketSearch,
} from "@/lib/data/market";
import { requireProfile } from "@/lib/data/profile";
import { MARKET_PAGE_SIZE, MARKET_SORTS, MARKET_TABS, PRICE_BUCKETS, parseMarketQuery, type MarketTab } from "@/lib/market";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Marché" };

export default async function MarchePage({ searchParams }: PageProps<"/marche">) {
  const profile = await requireProfile();
  const query = parseMarketQuery(await searchParams);
  const [total, feePercent] = await Promise.all([getCollectionTotal(), getMarketFeePercent()]);

  const tabHref = (tab: MarketTab) => (tab === "annonces" ? "/marche" : `/marche?onglet=${tab}`);

  return (
    <>
      <PageHeader title="Marché" subtitle={`Prix fixes entre joueurs · commission de ${feePercent} % prélevée sur chaque vente`} />

      <nav aria-label="Onglets du marché" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {(Object.keys(MARKET_TABS) as MarketTab[]).map((tab) => (
          <Link
            key={tab}
            href={tabHref(tab)}
            aria-current={query.tab === tab ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-150",
              query.tab === tab ? "border-turf font-semibold text-chalk" : "border-transparent text-chalk-muted hover:text-chalk",
            )}
          >
            {MARKET_TABS[tab]}
          </Link>
        ))}
      </nav>

      {query.tab === "annonces" && <ListingsTab query={query} viewerId={profile.id} balance={profile.coins} total={total} />}
      {query.tab === "ventes" && <SalesTab />}
      {query.tab === "recherchees" && <WantedTab total={total} />}
      {query.tab === "mes-annonces" && <MyListingsTab viewerId={profile.id} balance={profile.coins} total={total} />}
    </>
  );
}

async function ListingsTab({
  query,
  viewerId,
  balance,
  total,
}: {
  query: ReturnType<typeof parseMarketQuery>;
  viewerId: string;
  balance: number;
  total: number;
}) {
  if (query.q) await recordMarketSearch({ query: query.q });
  const [{ listings, total: count }, options] = await Promise.all([listActiveListings(query), getMarketFilterOptions()]);
  const pages = Math.max(1, Math.ceil(count / MARKET_PAGE_SIZE));

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (query.q) qs.set("q", query.q);
    if (query.rarity) qs.set("rarete", query.rarity);
    if (query.club) qs.set("club", query.club);
    if (query.nation) qs.set("nation", query.nation);
    if (query.price) qs.set("prix", query.price);
    if (query.sort !== "recent") qs.set("tri", query.sort);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/marche?${s}` : "/marche";
  };

  return (
    <>
      <div className="mb-3">
        <Suspense fallback={<FilterBarSkeleton />}>
          <FilterBar
            searchPlaceholder="Rechercher un joueur…"
            selects={[
              { name: "rarete", label: "Rareté", allLabel: "Toutes raretés", options: RARITIES.map((r) => ({ value: r, label: RARITY_LABELS[r] })) },
              { name: "club", label: "Club", allLabel: "Tous les clubs", options: options.clubs },
              { name: "nation", label: "Nation", allLabel: "Toutes nations", options: options.nations },
              {
                name: "prix",
                label: "Prix",
                allLabel: "Tous les prix",
                options: Object.entries(PRICE_BUCKETS).map(([value, b]) => ({ value, label: b.label })),
              },
              { name: "tri", label: "Trier par", options: Object.entries(MARKET_SORTS).map(([value, label]) => ({ value, label })) },
            ]}
          />
        </Suspense>
      </div>
      <p className="mb-3 text-xs text-chalk-muted">
        {count} annonce{count > 1 ? "s" : ""}
      </p>
      {listings.length === 0 ? (
        <EmptyState title="Rien sur le marché">Aucune annonce ne correspond à ces critères.</EmptyState>
      ) : (
        <LiveListingGrid listings={listings} viewerId={viewerId} balance={balance} collectionTotal={total} />
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm">
          {query.page > 1 ? <Link href={pageHref(query.page - 1)} className={buttonClasses("secondary", "sm")}>← Précédentes</Link> : <span />}
          <span className="text-chalk-muted tabular-nums">Page {query.page} / {pages}</span>
          {query.page < pages ? <Link href={pageHref(query.page + 1)} className={buttonClasses("secondary", "sm")}>Suivantes →</Link> : <span />}
        </nav>
      )}
    </>
  );
}

async function SalesTab() {
  const sales = await listRecentSales(40);
  return sales.length === 0 ? (
    <EmptyState title="Aucune vente">Le marché attend son premier coup franc.</EmptyState>
  ) : (
    <Panel>
      <SalesTable sales={sales} />
    </Panel>
  );
}

async function WantedTab({ total }: { total: number }) {
  const wanted = await listMostWanted(24);
  if (wanted.length === 0) return <EmptyState title="Pas encore de tendance">Les recherches et listes de souhaits feront remonter les cartes ici.</EmptyState>;
  return (
    <>
      <p className="mb-3 text-xs text-chalk-muted">Classement sur 30 jours : recherches sur le marché + listes de souhaits des joueurs.</p>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        {wanted.map((w, i) => (
          <li key={w.template.id} className="flex w-[168px] flex-col gap-1.5 max-sm:w-[132px]">
            <Link href={`/marche/carte/${w.template.id}`} className="relative block rounded-[var(--radius-card)]">
              <span className="absolute -top-2 -left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-turf font-display text-sm font-extrabold text-turf-ink">
                {i + 1}
              </span>
              <Card template={w.template} collectionTotal={total} className="max-sm:w-[132px]" />
            </Link>
            <p className="text-xs text-chalk-muted">
              {w.searches} recherche{w.searches > 1 ? "s" : ""} · {w.wishes} souhait{w.wishes > 1 ? "s" : ""}
            </p>
            <p className="text-xs">
              {w.lowestPrice !== null ? (
                <>
                  {w.activeListings} en vente dès <CoinAmount amount={w.lowestPrice} className="text-xs" />
                </>
              ) : (
                <span className="text-chalk-faint">Aucune en vente</span>
              )}
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}

async function MyListingsTab({ viewerId, balance, total }: { viewerId: string; balance: number; total: number }) {
  const mine = await listMyListings(viewerId);
  return mine.length === 0 ? (
    <EmptyState title="Aucune annonce en cours">
      Mets une carte en vente depuis sa fiche dans ta{" "}
      <Link href="/collection" className="font-semibold text-turf hover:underline">
        collection
      </Link>
      .
    </EmptyState>
  ) : (
    <LiveListingGrid listings={mine} viewerId={viewerId} balance={balance} collectionTotal={total} showNewBanner={false} />
  );
}
