import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlbumProgress, albumPercent } from "@/components/albums/AlbumProgress";
import { FilterBar, FilterBarSkeleton } from "@/components/ui/FilterBar";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { ALBUM_KIND_LABELS, listAlbums, type AlbumSummary } from "@/lib/data/albums";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Albums" };

/** Ordre utile : récompense à réclamer, puis albums commencés (les plus avancés d'abord), puis le reste, complétés en dernier. */
function albumRank(a: AlbumSummary): number {
  if (a.completedAt) return 3;
  if (a.owned === a.total) return 0;
  return a.owned > 0 ? 1 : 2;
}

const normalize = (v: string) => v.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default async function AlbumsPage({ searchParams }: PageProps<"/albums">) {
  const [profile, sp] = await Promise.all([requireProfile(), searchParams]);
  const all = await listAlbums(profile.id);
  const completed = all.filter((a) => a.completedAt).length;
  const type = typeof sp.type === "string" ? sp.type : "";
  const q = typeof sp.q === "string" ? normalize(sp.q.trim()) : "";
  const albums = all
    .filter((a) => {
      if (type === "encours" && (a.completedAt || a.owned === 0)) return false;
      if (type === "club" && a.kind !== "club") return false;
      if (type === "autres" && a.kind === "club") return false;
      return !q || normalize(a.name).includes(q);
    })
    .sort(
      (a, b) =>
        albumRank(a) - albumRank(b) ||
        albumPercent(b.owned, b.total) - albumPercent(a.owned, a.total) ||
        a.name.localeCompare(b.name, "fr"),
    );

  return (
    <>
      <PageHeader
        title="Albums"
        subtitle={`${completed} album${completed > 1 ? "s" : ""} complété${completed > 1 ? "s" : ""} sur ${all.length}`}
      />
      <div className="mb-4">
        <Suspense fallback={<FilterBarSkeleton />}>
          <FilterBar
            searchPlaceholder="Club, compétition…"
            selects={[
              {
                name: "type",
                label: "Type d'album",
                allLabel: "Tous les albums",
                options: [
                  { value: "encours", label: "Commencés" },
                  { value: "club", label: "Clubs" },
                  { value: "autres", label: "Sélections, légendes, compétitions" },
                ],
              },
            ]}
          />
        </Suspense>
      </div>
      {albums.length === 0 ? (
        <EmptyState title={all.length === 0 ? "Aucun album" : "Aucun album ne correspond"}>
          {all.length === 0 ? "Les albums arrivent bientôt dans les tribunes." : "Essaie un autre nom ou un autre type."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {albums.map((a) => {
            const ready = !a.completedAt && a.owned === a.total;
            return (
              <li key={a.id}>
                <Link
                  href={`/albums/${a.slug}`}
                  className="pp-net flex h-full flex-col gap-3 rounded-xl border border-line bg-night-850 p-4 transition-colors duration-150 hover:border-line-strong hover:bg-night-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-xs font-bold tracking-wider text-chalk-faint uppercase">{ALBUM_KIND_LABELS[a.kind]}</p>
                      <p className="font-display text-xl leading-tight font-extrabold tracking-wide uppercase">{a.name}</p>
                    </div>
                    {a.completedAt ? (
                      <span className="rounded-md bg-r-legendaire/15 px-2 py-0.5 text-xs font-semibold text-r-legendaire">Complété</span>
                    ) : ready ? (
                      <span className="rounded-md bg-turf/15 px-2 py-0.5 text-xs font-semibold text-turf">Récompense à réclamer</span>
                    ) : null}
                  </div>
                  {a.description && <p className="text-sm text-chalk-muted">{a.description}</p>}
                  <div className="mt-auto space-y-2">
                    <AlbumProgress owned={a.owned} total={a.total} complete={Boolean(a.completedAt)} />
                    {a.rewardCoins > 0 && (
                      <p className="text-xs text-chalk-muted">
                        Récompense : <CoinAmount amount={a.rewardCoins} className="text-xs" />
                      </p>
                    )}
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
