import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BulkSellButton } from "@/components/collection/BulkSellButton";
import { Card } from "@/components/ui/Card";
import { FilterBar, FilterBarSkeleton } from "@/components/ui/FilterBar";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { applyCollectionQuery, filterOptions, parseCollectionQuery, SORTS, type CollectionItem } from "@/lib/collection";
import { getDuplicatePrices } from "@/lib/data/boosters";
import { getCollection, getCollectionTotal } from "@/lib/data/cards";
import { requireProfile } from "@/lib/data/profile";
import { POSITION_LABELS, RARITIES, RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Collection" };

export default async function CollectionPage({ searchParams }: PageProps<"/collection">) {
  const profile = await requireProfile();
  const [groups, total, params, prices] = await Promise.all([
    getCollection(profile.id),
    getCollectionTotal(),
    searchParams,
    getDuplicatePrices(),
  ]);
  const allCopies = groups.flatMap((g) =>
    g.copies.map((c) => ({ templateId: g.template.id, serialNumber: c.serialNumber, rarity: g.template.rarity, isLocked: c.isLocked })),
  );
  const copies = groups.reduce((n, g) => n + g.copies.length, 0);

  const items = groups.map((g) => ({
    template: g.template,
    copies: g.copies.length,
    lastObtainedAt: g.copies[0]!.obtainedAt,
    serialNumber: g.copies[0]!.serialNumber,
  })) satisfies CollectionItem[];
  const query = parseCollectionQuery(params);
  const visible = applyCollectionQuery(items, query);
  const { clubs, nations } = filterOptions(items);

  return (
    <>
      <PageHeader
        title="Collection"
        subtitle={
          groups.length > 0
            ? `${groups.length} cartes différentes sur ${total} · ${copies} exemplaires`
            : `0 carte sur ${total}`
        }
      >
        {groups.length > 0 && <BulkSellButton copies={allCopies} prices={prices} />}
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState title="Ta collection est vide">
          Les cartes que tu obtiendras apparaîtront ici.{" "}
          <Link href="/boosters" className="font-semibold text-turf hover:underline">
            Ouvrir un booster
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="mb-4">
            <Suspense fallback={<FilterBarSkeleton />}>
              <FilterBar
                searchPlaceholder="Joueur, club, nation…"
                selects={[
                  { name: "rarete", label: "Rareté", allLabel: "Toutes raretés", options: RARITIES.map((r) => ({ value: r, label: RARITY_LABELS[r] })) },
                  { name: "club", label: "Club", allLabel: "Tous les clubs", options: clubs },
                  { name: "nation", label: "Nation", allLabel: "Toutes nations", options: nations },
                  {
                    name: "poste",
                    label: "Poste",
                    allLabel: "Tous postes",
                    options: Object.entries(POSITION_LABELS).map(([value, label]) => ({ value, label })),
                  },
                  { name: "tri", label: "Trier par", options: Object.entries(SORTS).map(([value, label]) => ({ value, label: `Tri : ${label}` })) },
                ]}
                toggles={[{ name: "doublons", label: "Doublons" }]}
              />
            </Suspense>
          </div>

          <p className="mb-3 text-xs text-chalk-muted" aria-live="polite">
            {visible.length === items.length ? `${items.length} cartes` : `${visible.length} carte${visible.length > 1 ? "s" : ""} sur ${items.length}`}
          </p>

          {visible.length === 0 ? (
            <EmptyState title="Hors-jeu !">Aucune carte ne correspond à ces filtres.</EmptyState>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
              {visible.map((it) => (
                <li key={it.template.id}>
                  <Link href={`/collection/${it.template.id}`} className="block rounded-[var(--radius-card)]" aria-label={`Détail : ${it.template.playerName}`}>
                    <Card
                      template={it.template}
                      collectionTotal={total}
                      serialNumber={it.serialNumber}
                      copies={it.copies}
                      className="max-sm:w-[132px]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
