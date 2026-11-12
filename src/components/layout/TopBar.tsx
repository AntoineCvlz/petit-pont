import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CurrentProfile } from "@/lib/data/profile";
import { UserMenu } from "./UserMenu";

/**
 * Barre supérieure : solde, avatar.
 * Le compte à rebours du booster gratuit (phase 2) et la cloche de notifications (phase 7)
 * seront ajoutés avec leurs fonctionnalités.
 */
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

export function TopBar({ profile }: { profile: CurrentProfile }) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-night-900/90 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center" aria-label="Petit Pont — accueil">
          <Logo className="hidden sm:inline-flex" />
          <LogoMark className="h-8 w-8 sm:hidden" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg border border-line bg-night-850 px-2.5 py-1 text-sm" title="Ton solde de pièces">
            <CoinAmount amount={profile.coins} />
          </div>
          <UserMenu username={profile.username} />
        </div>
      </div>
    </header>
  );
}
