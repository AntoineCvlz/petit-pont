import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumProgress } from "@/components/albums/AlbumProgress";
import { ClaimRewardButton } from "@/components/albums/ClaimRewardButton";
import { MissingSlot } from "@/components/albums/MissingSlot";
import { Card } from "@/components/ui/Card";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { Panel } from "@/components/ui/Panel";
import { ALBUM_KIND_LABELS, getAlbum } from "@/lib/data/albums";
import { getCollectionTotal } from "@/lib/data/cards";
import { requireProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Album" };

export default async function AlbumPage({ params }: PageProps<"/albums/[slug]">) {
  const { slug } = await params;
  const profile = await requireProfile();
  const [album, total] = await Promise.all([getAlbum(slug, profile.id), getCollectionTotal()]);
  if (!album) notFound();

  const complete = album.owned === album.total;

  return (
    <>
      <Link href="/albums" className="text-sm text-chalk-muted hover:text-chalk">
        ← Albums
      </Link>
      <div className="mt-3 mb-5">
        <p className="font-display text-xs font-bold tracking-wider text-chalk-faint uppercase">{ALBUM_KIND_LABELS[album.kind]}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{album.name}</h1>
        {album.description && <p className="mt-0.5 text-sm text-chalk-muted">{album.description}</p>}
      </div>

      <Panel className="mb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <AlbumProgress owned={album.owned} total={album.total} complete={Boolean(album.completedAt)} className="md:w-96" />
          <div className="text-sm">
            {album.completedAt ? (
              <p className="font-semibold text-r-legendaire">
                Album complété le {formatDate(album.completedAt)}
                {album.rewardCoins > 0 && (
                  <>
                    {" · "}
                    <CoinAmount amount={album.rewardCoins} /> encaissées
                  </>
                )}
              </p>
            ) : complete && album.rewardCoins > 0 ? (
              <ClaimRewardButton albumId={album.id} reward={album.rewardCoins} />
            ) : complete ? (
              <ClaimRewardButton albumId={album.id} reward={0} />
            ) : (
              <p className="text-chalk-muted">
                Encore {album.total - album.owned} carte{album.total - album.owned > 1 ? "s" : ""} pour décrocher{" "}
                {album.rewardCoins > 0 ? <CoinAmount amount={album.rewardCoins} /> : "l'album"}
              </p>
            )}
          </div>
        </div>
      </Panel>

      <ol className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        {album.slots.map((s) => (
          <li key={s.slotNumber}>
            {s.owned ? (
              <Link href={`/collection/${s.template.id}`} className="block rounded-[var(--radius-card)]">
                <Card template={s.template} collectionTotal={total} copies={s.copies} className="max-sm:w-[132px]" />
              </Link>
            ) : (
              <MissingSlot slotNumber={s.slotNumber} rarity={s.template.rarity} />
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
