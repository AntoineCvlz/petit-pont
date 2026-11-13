import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SbcBuilder, type SbcPick } from "@/components/farm/SbcBuilder";
import { Panel } from "@/components/ui/Panel";
import { getOwnedCopies, getReferenceNames, getSbcList } from "@/lib/data/farm";
import { requireProfile } from "@/lib/data/profile";
import { REPEAT_LABELS } from "@/lib/sbc";

export const metadata: Metadata = { title: "Défi d'équipe" };

export default async function SbcChallengePage({ params }: PageProps<"/defis/[slug]">) {
  const { slug } = await params;
  const profile = await requireProfile();
  const [challenges, copies, names] = await Promise.all([getSbcList(), getOwnedCopies(profile.id), getReferenceNames()]);
  const challenge = challenges.find((c) => c.slug === slug);
  if (!challenge) notFound();

  const cards: SbcPick[] = copies.map((c) => ({
    instanceId: c.instanceId,
    playerName: c.template.playerName,
    edition: c.template.edition === "Base" ? c.template.season : c.template.edition,
    rating: c.template.rating,
    rarity: c.template.rarity,
    nation: c.template.nation.code,
    nationName: c.template.nation.name,
    club: c.template.club?.code ?? null,
    clubName: c.template.club?.name ?? null,
    league: c.leagueCode,
    copies: c.copies,
    isLocked: c.isLocked,
  }));

  return (
    <>
      <Link href="/defis" className="text-sm text-chalk-muted hover:text-chalk">
        ← Défis d&apos;équipe
      </Link>
      <div className="mt-3 mb-5">
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{challenge.name}</h1>
        <p className="text-sm text-chalk-muted">
          {challenge.description} · Récompense :{" "}
          <span className="font-semibold text-turf">
            {challenge.rewardCount > 1 ? `${challenge.rewardCount} × ` : ""}
            {challenge.rewardBoosterName}
          </span>{" "}
          · {REPEAT_LABELS[challenge.repeat]}
        </p>
      </div>
      <Panel>
        <SbcBuilder
          challengeId={challenge.id}
          requirements={challenge.requirements}
          available={challenge.available}
          cards={cards}
          names={names}
        />
      </Panel>
    </>
  );
}
