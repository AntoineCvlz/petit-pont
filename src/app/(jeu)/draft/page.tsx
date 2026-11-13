import type { Metadata } from "next";
import Link from "next/link";
import { DraftOffer, DraftStart } from "@/components/draft/DraftControls";
import { DraftLeaderboard, DraftScoreline, LinkLegend } from "@/components/draft/DraftLeaderboard";
import { DraftPitch } from "@/components/draft/DraftPitch";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { getCollectionTotal } from "@/lib/data/cards";
import {
  getDraftLeaderboard,
  getDraftStatus,
  getFormations,
  linkIdentity,
  resolveDraftCards,
  type DraftCard,
  type DraftState,
} from "@/lib/data/draft";
import { draftChemistry, draftScore, type DraftFormation } from "@/lib/draft";

export const metadata: Metadata = { title: "Draft" };

async function DraftBoard({ draft, formation, total }: { draft: DraftState; formation: DraftFormation; total: number }) {
  const cards = await resolveDraftCards([...Object.values(draft.picks), ...draft.offer]);
  const picks: Record<string, DraftCard> = {};
  for (const [slot, id] of Object.entries(draft.picks)) {
    const c = cards.get(id);
    if (c) picks[slot] = c;
  }
  const picked = Object.values(picks);
  const rating = picked.length ? picked.reduce((s, c) => s + c.rating, 0) / picked.length : null;
  const chem = draftChemistry(formation, Object.fromEntries(Object.entries(picks).map(([k, c]) => [k, linkIdentity(c)]))).total;
  const slot = formation.slots[draft.currentSlot]!;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,560px)_1fr]">
      <div className="space-y-3">
        <DraftScoreline rating={rating} chemistry={chem} score={rating === null ? null : draftScore(rating, chem)} provisional />
        <DraftPitch formation={formation} picks={picks} currentSlot={slot.key} />
      </div>
      {/* Sur mobile, les choix d'abord (action principale), le terrain ensuite */}
      <Panel className="order-first xl:order-none">
        <DraftOffer
          draftId={draft.id}
          slotLabel={slot.label}
          step={draft.currentSlot + 1}
          offer={draft.offer.map((id) => cards.get(id)).filter((c): c is DraftCard => Boolean(c))}
          collectionTotal={total}
        />
      </Panel>
    </div>
  );
}

export default async function DraftPage() {
  const [status, formations, leaderboard, total] = await Promise.all([
    getDraftStatus(),
    getFormations(),
    getDraftLeaderboard(50),
    getCollectionTotal(),
  ]);
  const active = status.active;
  const formation = active ? formations.find((f) => f.code === active.formation) : undefined;
  const plural = status.remaining > 1 ? "s" : "";

  return (
    <>
      <PageHeader
        title="Draft"
        subtitle={`Compose ton onze poste par poste, 5 cartes au choix à chaque fois. ${status.remaining}/${status.dailyLimit} draft${plural} restant${plural} aujourd'hui.`}
      />
      {active && formation ? (
        <>
          <DraftBoard draft={active} formation={formation} total={total} />
          <Panel title="Classement (meilleur score)" className="mt-5">
            <DraftLeaderboard rows={leaderboard.slice(0, 10)} />
          </Panel>
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <Panel title="Nouveau draft">
              <DraftStart formations={formations} remaining={status.remaining} />
            </Panel>
            <Panel title="Les liens">
              <LinkLegend />
            </Panel>
          </div>
          <div className="space-y-5">
            {status.best && (
              <Panel title="Ton record">
                <Link href={`/draft/${status.best.id}`} className="block hover:opacity-90">
                  <DraftScoreline rating={status.best.rating} chemistry={status.best.chemistry} score={status.best.score} />
                </Link>
              </Panel>
            )}
            <Panel title="Classement (meilleur score)">
              <DraftLeaderboard rows={leaderboard} />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
