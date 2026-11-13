import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClanAdmin, ClanChat, JoinOpenClanButton, KickButton } from "@/components/social/ClanUI";
import { Avatar } from "@/components/ui/Avatar";
import { Panel } from "@/components/ui/Panel";
import { requireProfile } from "@/lib/data/profile";
import { getClanDetail, getClanMessages, getMyClanId } from "@/lib/data/social";

export const metadata: Metadata = { title: "Clan" };

export default async function ClanPage({ params }: PageProps<"/clans/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const [clan, myClan] = await Promise.all([getClanDetail(id), getMyClanId(profile.id)]);
  if (!clan) notFound();
  const messages = clan.isMember ? await getClanMessages(clan.id) : [];
  const isOwner = clan.ownerId === profile.id;
  const names = Object.fromEntries(clan.memberList.map((m) => [m.userId, { username: m.username, avatarUrl: m.avatarUrl }]));

  return (
    <>
      <Link href="/clans" className="text-sm text-chalk-muted hover:text-chalk">
        ← Clans
      </Link>
      <div className="mt-3 mb-5 flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-night-700 px-2 py-1 font-mono text-sm font-bold">{clan.tag}</span>
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{clan.name}</h1>
        {!clan.isMember && !myClan && clan.isOpen && clan.members < 20 && <JoinOpenClanButton clanId={clan.id} />}
      </div>
      {clan.description && <p className="-mt-3 mb-5 text-sm text-chalk-muted">{clan.description}</p>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {clan.goal && (
            <Panel title="Objectif de la semaine">
              <p className="mb-2 font-semibold">{clan.goal.title}</p>
              <div className="h-2.5 overflow-hidden rounded-full bg-night-700" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-turf"
                  style={{ width: `${Math.min(100, (100 * clan.goal.progress) / clan.goal.target)}%` }}
                />
              </div>
              <p className="mt-1.5 text-sm text-chalk-muted">
                {clan.goal.progress}/{clan.goal.target}
                {clan.goal.completed
                  ? " · atteint ! Chaque contributeur a reçu un Booster Tribune."
                  : " · un Booster Tribune pour chaque membre qui contribue, dès que l'objectif est atteint."}
              </p>
            </Panel>
          )}
          {clan.isMember ? (
            <Panel title="Discussion">
              <ClanChat clanId={clan.id} meId={profile.id} isOwner={isOwner} initial={messages} names={names} />
            </Panel>
          ) : (
            <Panel>
              <p className="text-sm text-chalk-muted">La discussion et l&apos;objectif hebdomadaire sont réservés aux membres.</p>
            </Panel>
          )}
        </div>
        <div className="space-y-5">
          <Panel title={`Membres (${clan.members}/20)`}>
            <ul className="divide-y divide-line">
              {clan.memberList.map((m) => (
                <li key={m.userId} className="flex items-center gap-2 py-2">
                  <Avatar name={m.username} url={m.avatarUrl} />
                  <Link
                    href={`/joueurs/${encodeURIComponent(m.username)}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
                  >
                    {m.username}
                  </Link>
                  {m.role === "owner" && <span className="rounded bg-coin/15 px-1.5 text-xs text-coin">chef</span>}
                  {m.contribution !== null && (
                    <span className="text-xs text-chalk-faint tabular-nums" title="Contribution à l'objectif de la semaine">
                      +{m.contribution}
                    </span>
                  )}
                  {isOwner && m.userId !== profile.id && <KickButton userId={m.userId} username={m.username} />}
                </li>
              ))}
            </ul>
          </Panel>
          {clan.isMember && (
            <Panel title="Gestion">
              <ClanAdmin description={clan.description} isOpen={clan.isOpen} inviteCode={clan.inviteCode} isOwner={isOwner} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
