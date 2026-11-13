import type { Metadata } from "next";
import Link from "next/link";
import { CreateClanForm, JoinClanByCode, JoinOpenClanButton } from "@/components/social/ClanUI";
import { buttonClasses } from "@/components/ui/Button";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { requireProfile } from "@/lib/data/profile";
import { getClanList, getMyClanId } from "@/lib/data/social";

export const metadata: Metadata = { title: "Clans" };

export default async function ClansPage() {
  const profile = await requireProfile();
  const [clans, myClan] = await Promise.all([getClanList(), getMyClanId(profile.id)]);
  return (
    <>
      <PageHeader
        title="Clans"
        subtitle="Rejoins une bande de collectionneurs : discussion, objectif commun chaque semaine, et un pack pour chaque membre qui y contribue."
      >
        {myClan && (
          <Link href={`/clans/${myClan}`} className={buttonClasses("primary", "md")}>
            Mon clan
          </Link>
        )}
      </PageHeader>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={`Annuaire (${clans.length})`}>
          {clans.length === 0 ? (
            <p className="text-sm text-chalk-muted">Aucun clan pour l&apos;instant : fonde le premier !</p>
          ) : (
            <ul className="divide-y divide-line">
              {clans.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-12 shrink-0 rounded-md bg-night-700 py-1 text-center font-mono text-xs font-bold">
                    {c.tag}
                  </span>
                  <Link href={`/clans/${c.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block truncate text-xs text-chalk-faint">
                      {c.members}/20 membres · {c.goalsCompleted} objectif{c.goalsCompleted > 1 ? "s" : ""} atteint
                      {c.goalsCompleted > 1 ? "s" : ""}
                      {c.isOpen ? "" : " · sur invitation"}
                      {c.description ? ` · ${c.description}` : ""}
                    </span>
                  </Link>
                  {!myClan && c.isOpen && c.members < 20 && <JoinOpenClanButton clanId={c.id} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {!myClan && (
          <div className="space-y-5">
            <Panel title="Rejoindre avec un code">
              <JoinClanByCode />
            </Panel>
            <Panel title="Fonder un clan">
              <CreateClanForm />
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
