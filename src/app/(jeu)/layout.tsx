import { Suspense } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { TopBar, TopBarSkeleton } from "@/components/layout/TopBar";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getFreeBoosterNextAt } from "@/lib/data/boosters";
import { getDailyBonusStatus } from "@/lib/data/economy";
import { getUnreadCount } from "@/lib/data/notifications";
import { requireProfile } from "@/lib/data/profile";

/** Les préférences du joueur (animations réduites) s'appliquent à toute la zone de jeu. */
async function GameShell({ children }: { children: React.ReactNode }) {
  const [profile, freeBooster, dailyBonus, unread] = await Promise.all([
    requireProfile(),
    getFreeBoosterNextAt(),
    getDailyBonusStatus(),
    getUnreadCount(),
  ]);
  return (
    <div data-reduced-motion={profile.reducedMotion ? "true" : undefined}>
      <TopBar profile={profile} freeBooster={freeBooster} dailyBonus={dailyBonus} unread={unread} />
      <div className="mx-auto flex max-w-[1400px]">
        <SideNav />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-24 md:px-6 md:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

function ShellFallback() {
  return (
    <div>
      <TopBarSkeleton />
      <div className="mx-auto flex max-w-[1400px]">
        <div aria-hidden="true" className="hidden w-52 shrink-0 border-r border-line md:block" />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-24 md:px-6 md:pb-10">
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <GameShell>{children}</GameShell>
    </Suspense>
  );
}
