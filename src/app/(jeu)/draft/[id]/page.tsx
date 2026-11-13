import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftScoreline, LinkLegend } from "@/components/draft/DraftLeaderboard";
import { DraftPitch } from "@/components/draft/DraftPitch";
import { buttonClasses } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { getCompletedDraft, getDraftLeaderboard } from "@/lib/data/draft";
import { requireProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Équipe de draft" };

export default async function DraftResultPage({ params }: PageProps<"/draft/[id]">) {
  const { id } = await params;
  const [profile, draft, leaderboard] = await Promise.all([requireProfile(), getCompletedDraft(id), getDraftLeaderboard(200)]);
  if (!draft) notFound();
  const mine = draft.userId === profile.id;
  const entry = leaderboard.find((r) => r.draftId === draft.id);

  return (
    <>
      <Link href="/draft" className="text-sm text-chalk-muted hover:text-chalk">
        ← Draft
      </Link>
      <div className="mt-3 mb-5">
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">
          {mine ? "Ton équipe" : `Équipe de ${draft.username}`}
        </h1>
        <p className="text-sm text-chalk-muted">
          {draft.formation.name} · {formatDate(draft.completedAt)}
          {entry && (
            <>
              {" "}
              · <span className="font-semibold text-turf">{entry.rank === 1 ? "1er" : `${entry.rank}e`} au classement</span>
            </>
          )}
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,560px)_1fr]">
        <div className="space-y-3">
          <DraftScoreline rating={draft.rating} chemistry={draft.chemistry} score={draft.score} />
          <DraftPitch formation={draft.formation} picks={draft.picks} />
        </div>
        <div className="space-y-5">
          {mine && (
            <Panel>
              <p className="mb-3 text-sm text-chalk-muted">
                Seul ton meilleur score compte au classement. Les cartes du draft ne rejoignent pas ta collection.
              </p>
              <Link href="/draft" className={buttonClasses("primary", "md")}>
                Nouveau draft
              </Link>
            </Panel>
          )}
          <Panel title="Les liens">
            <LinkLegend />
          </Panel>
        </div>
      </div>
    </>
  );
}
