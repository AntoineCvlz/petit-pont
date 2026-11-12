import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { FilterBar, FilterBarSkeleton } from "@/components/ui/FilterBar";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { applyCollectionQuery, filterOptions, parseCollectionQuery, SORTS } from "@/lib/collection";
import { getCollection, getCollectionTotal } from "@/lib/data/cards";
import { getPlayerByUsername } from "@/lib/data/community";
import { requireProfile } from "@/lib/data/profile";
import { POSITION_LABELS, RARITIES, RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Collection d'un joueur" };

export default async function PlayerCollectionPage({ params, searchParams }: PageProps<"/joueurs/[username]/collection">) {
  const { username } = await params;
  await requireProfile();
  const player = await getPlayerByUsername(decodeURIComponent(username));
  if (!player) notFound();

  const [groups, total, sp] = await Promise.all([getCollection(player.id), getCollectionTotal(), searchParams]);
  const items = groups.map((g) => ({
    template: g.template,
    copies: g.copies.length,
    lastObtainedAt: g.copies[0]!.obtainedAt,
    serialNumber: g.copies[0]!.serialNumber,
  }));
  const visible = applyCollectionQuery(items, parseCollectionQuery(sp));
  const { clubs, nations } = filterOptions(items);
  const profileHref = `/joueurs/${encodeURIComponent(player.username)}`;

  return (
    <>
      <Link href={profileHref} className="text-sm text-chalk-muted hover:text-chalk">
        ← Profil de {player.username}
      </Link>
      <PageHeader title={`Collection de ${player.username}`} subtitle={`${groups.length} cartes différentes sur ${total}`} />
      {groups.length === 0 ? (
        <EmptyState title="Collection vide" />
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
                  { name: "poste", label: "Poste", allLabel: "Tous postes", options: Object.entries(POSITION_LABELS).map(([value, label]) => ({ value, label })) },
                  { name: "tri", label: "Trier par", options: Object.entries(SORTS).map(([value, label]) => ({ value, label: `Tri : ${label}` })) },
                ]}
                toggles={[{ name: "doublons", label: "Doublons" }]}
              />
            </Suspense>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
            {visible.map((it) => (
              <li key={it.template.id}>
                <Link href={`/marche/carte/${it.template.id}`} className="block rounded-[var(--radius-card)]" aria-label={`Prix de ${it.template.playerName}`}>
                  <Card template={it.template} collectionTotal={total} serialNumber={it.serialNumber} copies={it.copies} className="max-sm:w-[132px]" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
