import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { getCollection, getCollectionTotal } from "@/lib/data/cards";
import { requireProfile } from "@/lib/data/profile";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Collection" };

export default async function CollectionPage() {
  const profile = await requireProfile();
  const [groups, total] = await Promise.all([getCollection(profile.id), getCollectionTotal()]);
  const copies = groups.reduce((n, g) => n + g.copies.length, 0);

  const byRarity = RARITIES.map((r) => ({ rarity: r, count: groups.filter((g) => g.template.rarity === r).length })).filter(
    (x) => x.count > 0,
  );

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
        {byRarity.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-chalk-muted">
            {byRarity.map((x) => (
              <li key={x.rarity}>
                <span className="font-semibold" style={{ color: `var(--color-r-${x.rarity})` }}>
                  {x.count}
                </span>{" "}
                {RARITY_LABELS[x.rarity]}
              </li>
            ))}
          </ul>
        )}
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState title="Ta collection est vide">
          Les cartes que tu obtiendras apparaîtront ici.{" "}
          <Link href="/boosters" className="font-semibold text-turf hover:underline">
            Ouvrir un booster
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
          {groups.map((g) => (
            <li key={g.template.id}>
              <Card
                template={g.template}
                collectionTotal={total}
                serialNumber={g.copies[0]?.serialNumber}
                copies={g.copies.length}
                className="max-sm:w-[132px]"
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
