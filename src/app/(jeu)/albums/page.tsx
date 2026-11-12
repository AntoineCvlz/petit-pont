import type { Metadata } from "next";
import Link from "next/link";
import { AlbumProgress } from "@/components/albums/AlbumProgress";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { ALBUM_KIND_LABELS, listAlbums } from "@/lib/data/albums";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Albums" };

export default async function AlbumsPage() {
  const profile = await requireProfile();
  const albums = await listAlbums(profile.id);
  const completed = albums.filter((a) => a.completedAt).length;

  return (
    <>
      <PageHeader title="Albums" subtitle={`${completed} album${completed > 1 ? "s" : ""} complété${completed > 1 ? "s" : ""} sur ${albums.length}`} />
      {albums.length === 0 ? (
        <EmptyState title="Aucun album">Les albums arrivent bientôt dans les tribunes.</EmptyState>
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
