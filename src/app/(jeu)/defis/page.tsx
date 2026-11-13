import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui/Panel";
import { getReferenceNames, getSbcList } from "@/lib/data/farm";
import { RARITY_LABELS } from "@/lib/rarity";
import { REPEAT_LABELS, type SbcRequirements } from "@/lib/sbc";

export const metadata: Metadata = { title: "Défis d'équipe" };

function requirementChips(
  r: SbcRequirements,
  names: { leagues: Record<string, string>; nations: Record<string, string> },
): string[] {
  const chips: string[] = [];
  if (r.count) chips.push(`${r.count} cartes`);
  if (r.league) chips.push(names.leagues[r.league] ?? r.league);
  if (r.nation) chips.push(names.nations[r.nation] ?? r.nation);
  if (r.min_avg_rating) chips.push(`Note moy. ≥ ${r.min_avg_rating}`);
  if (r.min_rarity) chips.push(`${r.min_rarity.count}× ${RARITY_LABELS[r.min_rarity.rarity]}+`);
  if (r.distinct_nations) chips.push(`${r.distinct_nations} nations`);
  if (r.distinct_clubs) chips.push(`${r.distinct_clubs} clubs`);
  return chips;
}

export default async function SbcPage() {
  const [challenges, names] = await Promise.all([getSbcList(), getReferenceNames()]);
  return (
    <>
      <PageHeader
        title="Défis d'équipe"
        subtitle="Envoie des cartes qui respectent les conditions : elles sont détruites, tu reçois des packs. Parfait pour tes doublons."
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {challenges.map((c) => (
          <li key={c.id}>
            <Link
              href={`/defis/${c.slug}`}
              className={clsx(
                "flex h-full flex-col gap-2 rounded-xl border bg-night-850 p-4 transition-colors duration-150 hover:bg-night-800",
                c.available ? "border-line hover:border-line-strong" : "border-line opacity-60",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-display text-lg leading-tight font-extrabold tracking-wide uppercase">{c.name}</span>
                <span className="shrink-0 rounded bg-night-700 px-1.5 py-0.5 text-[11px] text-chalk-muted">
                  {REPEAT_LABELS[c.repeat]}
                </span>
              </span>
              <span className="text-sm text-chalk-muted">{c.description}</span>
              <span className="flex flex-wrap gap-1.5">
                {requirementChips(c.requirements, names).map((chip) => (
                  <span key={chip} className="rounded-md border border-line px-1.5 py-0.5 text-xs">
                    {chip}
                  </span>
                ))}
              </span>
              <span className="mt-auto flex items-center justify-between pt-1 text-sm">
                <span className="font-semibold text-turf">
                  {c.rewardCount > 1 ? `${c.rewardCount} × ` : ""}
                  {c.rewardBoosterName}
                </span>
                <span className="text-xs text-chalk-faint">
                  {c.available ? "Disponible" : c.repeat === "once" ? "Déjà réussi" : "Réussi, revient bientôt"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
