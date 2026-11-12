import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { FreeBoosterTimer } from "@/components/boosters/FreeBoosterTimer";
import { DailyBonusButton } from "@/components/economy/DailyBonusButton";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CurrentProfile } from "@/lib/data/profile";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

export function TopBarSkeleton() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-night-900/90">
      <div className="flex h-full items-center justify-between gap-3 px-4">
        <Logo className="hidden sm:inline-flex" />
        <LogoMark className="h-8 w-8 sm:hidden" />
        <Skeleton className="h-8 w-32" />
      </div>
    </header>
  );
}

/**
 * Barre supérieure : bonus quotidien (écrans larges), booster gratuit, solde, avatar.
 * Cloche de notifications en temps réel.
 */
export function TopBar({
  profile,
  freeBooster,
  dailyBonus,
  unread,
}: {
  profile: CurrentProfile;
  freeBooster: { slug: string; nextAt: string | null } | null;
  dailyBonus: { available: boolean; amount: number };
  unread: number;
}) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-night-900/90 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center" aria-label="Petit Pont — accueil">
          <Logo className="hidden sm:inline-flex" />
          <LogoMark className="h-8 w-8 sm:hidden" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {dailyBonus.available && (
            <span className="hidden sm:contents">
              <DailyBonusButton amount={dailyBonus.amount} compact />
            </span>
          )}
          {freeBooster && <FreeBoosterTimer slug={freeBooster.slug} nextAt={freeBooster.nextAt} />}
          <div className="rounded-lg border border-line bg-night-850 px-2.5 py-1 text-sm" title="Ton solde de pièces">
            <CoinAmount amount={profile.coins} />
          </div>
          <NotificationBell userId={profile.id} initialUnread={unread} />
          <UserMenu username={profile.username} />
        </div>
      </div>
    </header>
  );
}
