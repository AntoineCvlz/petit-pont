import type { Metadata } from "next";
import Link from "next/link";
import { ShowcaseEditor } from "@/components/community/ShowcaseEditor";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { getCollectionTotal } from "@/lib/data/cards";
import { getShowcase, getWishlist } from "@/lib/data/community";
import { getCollectionStats, requireProfile } from "@/lib/data/profile";
import { getTradableCopies } from "@/lib/data/trades";
import { formatDate } from "@/lib/format";
import { SettingsForm, UsernameForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const profile = await requireProfile();
  const [stats, total, showcase, copies, wishlist] = await Promise.all([
    getCollectionStats(profile.id),
    getCollectionTotal(),
    getShowcase(profile.id),
    getTradableCopies(profile.id),
    getWishlist(profile.id),
  ]);

  return (
    <>
      <PageHeader title="Profil">
        <Link href={`/joueurs/${encodeURIComponent(profile.username)}`} className={buttonClasses("secondary", "sm")}>
          Voir mon profil public
        </Link>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Mon joueur">
          <div className="flex items-center gap-4">
            <Avatar name={profile.username} url={profile.avatarUrl} size="lg" />
            <div>
              <p className="font-display text-2xl font-extrabold tracking-wide">{profile.username}</p>
              <p className="text-sm text-chalk-muted">Inscrit·e le {formatDate(profile.createdAt)}</p>
              {profile.isDemo && <p className="mt-1 text-xs text-r-legendaire">Compte de démonstration</p>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-night-800 p-3">
              <p className="font-display text-xl font-extrabold tabular-nums">
                {stats.distinctCards}
                <span className="text-sm text-chalk-faint">/{total}</span>
              </p>
              <p className="text-xs text-chalk-muted">Cartes</p>
            </div>
            <div className="rounded-lg bg-night-800 p-3">
              <p className="font-display text-xl font-extrabold tabular-nums">{stats.totalCopies}</p>
              <p className="text-xs text-chalk-muted">Exemplaires</p>
            </div>
            <div className="rounded-lg bg-night-800 p-3">
              <p className="font-display text-xl font-extrabold">
                <CoinAmount amount={profile.coins} />
              </p>
              <Link href="/profil/pieces" className="text-xs text-turf hover:underline">
                Historique des pièces
              </Link>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <UsernameForm current={profile.username} />
          </div>
        </Panel>

        <Panel title="Paramètres">
          <SettingsForm
            initial={{
              sound_enabled: profile.soundEnabled,
              reduced_motion: profile.reducedMotion,
              hide_activity: profile.hideActivity,
            }}
          />
        </Panel>

        <Panel title="Ma vitrine (5 cartes)" className="lg:col-span-2">
          <ShowcaseEditor copies={copies} initial={showcase.map((s) => s.instanceId)} total={total} />
        </Panel>

        <Panel title={`Ma liste de souhaits (${wishlist.length})`} className="lg:col-span-2">
          {wishlist.length === 0 ? (
            <p className="text-sm text-chalk-muted">
              Ajoute des cartes depuis le{" "}
              <Link href="/marche" className="font-semibold text-turf hover:underline">
                marché
              </Link>{" "}
              : les joueurs qui les ont en double te seront suggérés.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {wishlist.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/marche/carte/${t.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-night-800 px-2 py-1 text-xs hover:border-line-strong"
                  >
                    {t.playerName} <RarityBadge rarity={t.rarity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
