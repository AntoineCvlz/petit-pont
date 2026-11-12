import type { Metadata } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { getCollectionTotal } from "@/lib/data/cards";
import { getCollectionStats, requireProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";
import { SettingsForm, UsernameForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const profile = await requireProfile();
  const [stats, total] = await Promise.all([getCollectionStats(profile.id), getCollectionTotal()]);

  return (
    <>
      <PageHeader title="Profil" />
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
              <p className="text-xs text-chalk-muted">Pièces</p>
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
      </div>
    </>
  );
}
